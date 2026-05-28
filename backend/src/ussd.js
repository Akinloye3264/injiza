// USSD flow handler for Injiza
// Africa's Talking sends POST with: sessionId, serviceCode, phoneNumber, text
// Respond with "CON <text>" to continue or "END <text>" to terminate session.
//
// Flow:
//   initial (text="")  → language selection
//   "1" or "2"         → store lang, show main menu
//   "<lang>*<option>"  → handle menu option
//   "<lang>*1*<entry>" → parse and save bookkeeping entry

const { parseEntry, weeklyInsight } = require("./claude");
const { getSession, createSession, deleteSession } = require("./sessions");
const { saveRecord, getRecords } = require("./db");

const LANG_PROMPT = `CON Hitamo ururimi / Pick your language:\n1. Kinyarwanda\n2. English`;

const MAIN_MENU = {
  rw: `CON Murakaza neza kuri INJIZA 📒\n1. Injiza ibyagurishijwe/ibyaguze\n2. Reba inyungu yose\n3. Inama y'icyumweru\n4. Sohoka`,
  en: `CON Welcome to INJIZA 📒\n1. Record a sale or purchase\n2. View total profit\n3. Weekly coaching insight\n4. Exit`,
};

const MSG = {
  rw: {
    enter_entry: `CON Andika ibyo waguze n'ibyo wagurishije:\n(mfano: naguze ibirayi 5000, nagurishije 7000)`,
    no_records: `END Nta makuru afashwe. Injiza ibyagurishijwe mbere.`,
    profit_title: "📊 Inyungu yose",
    profit_label: "Inyungu",
    entries_label: "Inzira",
    insight_title: "💡 Inama y'icyumweru",
    saved: "✅ Byafashwe!",
    profit_zero: "",
    thanks: "Murakoze gukoresha INJIZA!\nKwinjiza amafaranga 💙",
    redial: "Piga *384*# kongera.",
    error_entry: "❌ Ntabwo byasobanuwe. Ongera ugerageze.\nMfano: naguze ibirayi 5000, nagurishije 7000",
    error_insight: "END Hari ikibazo. Ongera ugerageze.",
  },
  en: {
    enter_entry: `CON Enter what you bought and sold:\n(e.g. bought potatoes 5000, sold for 7000)`,
    no_records: `END No records yet. Record a transaction first.`,
    profit_title: "📊 Total profit",
    profit_label: "Profit",
    entries_label: "Entries",
    insight_title: "💡 Weekly insight",
    saved: "✅ Saved!",
    profit_zero: "",
    thanks: "Thank you for using INJIZA!\nMaking income visible 💙",
    redial: "Dial *384*# again.",
    error_entry: "❌ Could not parse entry. Try again.\nExample: bought potatoes 5000, sold for 7000",
    error_insight: "END Something went wrong. Please try again.",
  },
};

function fmt(n) {
  return n.toLocaleString("en-RW") + " RWF";
}

/**
 * A valid bookkeeping entry must describe an item (at least one letter)
 * AND include an amount (at least one digit), and be long enough to be meaningful.
 */
function isValidEntry(entry) {
  return (
    entry.trim().length >= 5 &&
    /[a-zA-ZÀ-ɏĀ-ɏ]/.test(entry) &&
    /\d/.test(entry)
  );
}

function totalProfit(records) {
  return records.reduce((sum, r) => sum + r.profit, 0);
}

function buildSummary(records) {
  if (!records.length) return "No records yet.";
  return records.map((r) => `"${r.entry}" → profit ${r.profit} RWF`).join("; ");
}

async function handleUSSD({ sessionId, phoneNumber, text }) {
  const parts = text ? text.split("*").map((p) => p.trim()) : [];

  let session = getSession(sessionId);
  if (!session) session = createSession(sessionId);

  // ── Initial dial: show language selection ────────────────────────────────
  if (!text || text === "") {
    return LANG_PROMPT;
  }

  // ── Language choice (first input) ────────────────────────────────────────
  if (parts.length === 1) {
    const choice = parts[0];
    if (choice !== "1" && choice !== "2") return LANG_PROMPT;
    const lang = choice === "2" ? "en" : "rw";
    session.lang = lang;
    return MAIN_MENU[lang];
  }

  // Resolve language from session (fall back to rw)
  const lang = session.lang || "rw";
  const m = MSG[lang];

  // ── Main menu selection (lang * option) ──────────────────────────────────
  if (parts.length === 2) {
    const opt = parts[1];

    switch (opt) {
      case "1":
        session.step = "AWAITING_ENTRY";
        return m.enter_entry;

      case "2": {
        // Load all records from DB — persists across sessions
        let dbRecords = [];
        try { dbRecords = await getRecords(phoneNumber); } catch (e) { console.error("DB error (profit):", e.message); }
        // Merge DB records with any unsaved in-session records (avoid duplicates by ts)
        const dbTs = new Set(dbRecords.map((r) => r.created_at?.getTime?.() ?? 0));
        const sessionOnly = session.records.filter((r) => !dbTs.has(r.ts));
        const allRecords = [...dbRecords, ...sessionOnly];
        if (!allRecords.length) return m.no_records;
        const profit = totalProfit(allRecords);
        const sign = profit >= 0 ? "+" : "";
        return (
          `END ${m.profit_title}\n` +
          `${m.profit_label}: ${sign}${fmt(profit)}\n` +
          `${m.entries_label}: ${allRecords.length}\n\n` +
          m.thanks
        );
      }

      case "3": {
        let dbRecords = [];
        try { dbRecords = await getRecords(phoneNumber); } catch (e) { console.error("DB error (insight):", e.message); }
        const sessionOnly = session.records;
        const allRecords = dbRecords.length ? dbRecords : sessionOnly;
        if (!allRecords.length) return m.no_records;
        try {
          const summary = buildSummary(allRecords);
          const insight = await weeklyInsight(summary);
          return `END ${m.insight_title}:\n${insight}`;
        } catch {
          return m.error_insight;
        }
      }

      case "4":
        deleteSession(sessionId);
        return `END ${m.thanks}`;

      default:
        return MAIN_MENU[lang];
    }
  }

  // ── Entry input: lang * 1 * <entry text> [ * <clarification> ] ───────────
  if (parts.length >= 3 && parts[1] === "1") {

    // ── Turn 2: user is answering a clarifying question ───────────────────
    if (session.step === "AWAITING_CLARIFICATION" && session.pendingEntry) {
      const answer = parts[parts.length - 1].trim();
      if (!answer) {
        return lang === "rw"
          ? `CON ${session.pendingQuestion}\n\nSubiza:`
          : `CON ${session.pendingQuestion}\n\nYour answer:`;
      }

      // Combine original entry with the clarification answer and re-parse
      const combined = `${session.pendingEntry}. ${answer}`;
      session.step = "MAIN_MENU";
      session.pendingEntry = "";
      session.pendingQuestion = "";

      try {
        const result = await parseEntry(combined);
        session.records.push({ ...result, entry: combined, ts: Date.now() });
        saveRecord({ phone: phoneNumber, channel: "ussd", entry: combined, ...result }).catch(
          (e) => console.error("DB save error (USSD clarification):", e)
        );
        const sign = result.profit >= 0 ? "+" : "";
        const profitLine = result.profit !== 0 ? `${m.profit_label}: ${sign}${fmt(result.profit)}\n` : "";
        return `END ${m.saved}\n${profitLine}${result.insight}\n\n${m.redial}`;
      } catch {
        return `END ${m.error_entry}`;
      }
    }

    // ── Turn 1: first submission ──────────────────────────────────────────
    const entry = parts.slice(2).join("*").trim();
    if (!entry) return m.enter_entry;

    if (!isValidEntry(entry)) {
      return lang === "rw"
        ? `CON ❌ Ntibyumvikana. Andika izina ry'igicuruzwa N'igiciro.\nMfano: naguze ibirayi 5000, nagurishije 7000\n\nOngera uandike:`
        : `CON ❌ Entry not recognized. Include item name AND amount.\nExample: bought potatoes 5000, sold for 7000\n\nTry again:`;
    }

    try {
      const result = await parseEntry(entry);

      // If Claude is asking a follow-up question, keep the session open
      if (result.insight.trim().endsWith("?")) {
        session.step = "AWAITING_CLARIFICATION";
        session.pendingEntry = entry;
        session.pendingQuestion = result.insight.trim();
        return lang === "rw"
          ? `CON ${result.insight}\n\nSubiza:`
          : `CON ${result.insight}\n\nYour answer:`;
      }

      // Claude gave a complete answer — save and end
      session.records.push({ ...result, entry, ts: Date.now() });
      saveRecord({ phone: phoneNumber, channel: "ussd", entry, ...result }).catch(
        (e) => console.error("DB save error (USSD):", e)
      );
      const sign = result.profit >= 0 ? "+" : "";
      const profitLine = result.profit !== 0 ? `${m.profit_label}: ${sign}${fmt(result.profit)}\n` : "";
      return `END ${m.saved}\n${profitLine}${result.insight}\n\n${m.redial}`;
    } catch {
      return `END ${m.error_entry}`;
    }
  }

  // Fallback
  return MAIN_MENU[lang];
}

module.exports = { handleUSSD };
