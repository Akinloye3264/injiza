// USSD flow handler for Injiza
// Africa's Talking sends POST with: sessionId, serviceCode, phoneNumber, text
// Respond with "CON <text>" to continue or "END <text>" to terminate session.

const { parseEntry, weeklyInsight } = require("./claude");
const { getSession, createSession, deleteSession } = require("./sessions");

const MAIN_MENU = `CON Murakaza neza kuri INJIZA 📒
1. Injiza ibyagurishijwe/ibyaguze
2. Reba inyungu y'uyu munsi
3. Inama y'icyumweru
4. Sohoka`;

/**
 * Format RWF amounts compactly for USSD (160-char limit per screen)
 */
function fmt(n) {
  return n.toLocaleString("en-RW") + " RWF";
}

/**
 * Compute total profit across all records in a session
 */
function totalProfit(records) {
  return records.reduce((sum, r) => sum + r.profit, 0);
}

/**
 * Build a plain-text summary of records for the weekly insight call
 */
function buildSummary(records) {
  if (!records.length) return "No records yet.";
  return records
    .map((r) => `Entry: "${r.entry}" → profit ${r.profit} RWF`)
    .join("; ");
}

/**
 * Main USSD handler — returns the full response string ("CON ..." or "END ...")
 * @param {object} params - { sessionId, phoneNumber, text }
 */
async function handleUSSD({ sessionId, phoneNumber, text }) {
  // text is the full chain of inputs separated by "*"
  const parts = text ? text.split("*").map((p) => p.trim()) : [];
  const latest = parts[parts.length - 1];

  let session = getSession(sessionId);

  // ── New session ──────────────────────────────────────────────────────────
  if (!text || text === "") {
    if (!session) createSession(sessionId);
    return MAIN_MENU;
  }

  if (!session) session = createSession(sessionId);

  // ── Main menu selection ──────────────────────────────────────────────────
  if (parts.length === 1) {
    switch (latest) {
      case "1":
        session.step = "AWAITING_ENTRY";
        return `CON Andika ibyo waguze n'ibyo wagurishije:\n(mfano: naguze ibirayi 5000, nagurishije 7000)`;

      case "2": {
        const profit = totalProfit(session.records);
        const entries = session.records.length;
        if (!entries) return `END Nta makuru afashwe. Injiza ibyagurishijwe mbere.`;
        const sign = profit >= 0 ? "+" : "";
        return `END 📊 Inyungu y'uyu munsi\nInyungu: ${sign}${fmt(profit)}\nInzira: ${entries}\n\nMurakoze gukoresha INJIZA!`;
      }

      case "3": {
        if (!session.records.length)
          return `END Nta makuru afashwe. Injiza ibyagurishijwe mbere.`;
        try {
          const summary = buildSummary(session.records);
          const insight = await weeklyInsight(summary);
          return `END 💡 Inama y'icyumweru:\n${insight}`;
        } catch {
          return `END Hari ikibazo. Ongera ugerageze.`;
        }
      }

      case "4":
        deleteSession(sessionId);
        return `END Murakoze gukoresha INJIZA!\nKwinjiza amafaranga 💙`;

      default:
        return MAIN_MENU;
    }
  }

  // ── Entry input (step 2 of option 1) ────────────────────────────────────
  if (parts.length === 2 && parts[0] === "1") {
    const entry = latest;
    if (!entry) return `CON Andika ibyo waguze n'ibyo wagurishije:`;

    try {
      const result = await parseEntry(entry);
      session.records.push({ ...result, entry, ts: Date.now() });

      const sign = result.profit >= 0 ? "+" : "";
      const profitLine =
        result.profit !== 0
          ? `Inyungu: ${sign}${fmt(result.profit)}\n`
          : "";

      return `END ✅ Byafashwe!\n${profitLine}${result.insight}\n\nPiga *384*# kongera.`;
    } catch {
      return `END ❌ Ntabwo byasobanuwe. Ongera ugerageze.\nMfano: naguze ibirayi 5000, nagurishije 7000`;
    }
  }

  // Fallback
  return MAIN_MENU;
}

module.exports = { handleUSSD };
