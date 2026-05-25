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

const LANG_PROMPT = `CON Hitamo ururimi / Pick your language:\n1. Kinyarwanda\n2. English`;

const MAIN_MENU = {
  rw: `CON Murakaza neza kuri INJIZA 📒\n1. Injiza ibyagurishijwe/ibyaguze\n2. Reba inyungu y'uyu munsi\n3. Inama y'icyumweru\n4. Sohoka`,
  en: `CON Welcome to INJIZA 📒\n1. Record a sale or purchase\n2. View today's profit\n3. Weekly coaching insight\n4. Exit`,
};

const MSG = {
  rw: {
    enter_entry: `CON Andika ibyo waguze n'ibyo wagurishije:\n(mfano: naguze ibirayi 5000, nagurishije 7000)`,
    no_records: `END Nta makuru afashwe. Injiza ibyagurishijwe mbere.`,
    profit_title: "📊 Inyungu y'uyu munsi",
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
    profit_title: "📊 Today's profit",
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
        if (!session.records.length) return m.no_records;
        const profit = totalProfit(session.records);
        const sign = profit >= 0 ? "+" : "";
        return (
          `END ${m.profit_title}\n` +
          `${m.profit_label}: ${sign}${fmt(profit)}\n` +
          `${m.entries_label}: ${session.records.length}\n\n` +
          m.thanks
        );
      }

      case "3": {
        if (!session.records.length) return m.no_records;
        try {
          const summary = buildSummary(session.records);
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

  // ── Entry input: lang * 1 * <entry text> ─────────────────────────────────
  if (parts.length >= 3 && parts[1] === "1") {
    const entry = parts.slice(2).join("*").trim();
    if (!entry) return m.enter_entry;

    try {
      const result = await parseEntry(entry);
      session.records.push({ ...result, entry, ts: Date.now() });

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
