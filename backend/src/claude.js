// Injiza AI Engine — channel-agnostic Claude caller
// PRODUCTION NOTE: This key is server-side only. Never expose ANTHROPIC_API_KEY to the browser.

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Injiza, a bookkeeping assistant for informal micro-business owners
in Rwanda. Users write what they bought and sold in casual Kinyarwanda,
English, or a mix (e.g. "naguze ibirayi 5000, nagurishije 7000" or "bought
potatoes 5000, sold for 7000"). Amounts are in Rwandan Francs (RWF).

Parse the entry into structured bookkeeping data. Infer sensible values when
phrasing is loose. "naguze/nguze" = bought (cost), "nagurishije/ngurishije"
= sold (revenue).

Respond ONLY with valid JSON, no markdown, no preamble:
{"items":[{"name":"...","cost":0,"revenue":0}],"total_cost":0,
"total_revenue":0,"profit":0,"insight":"one short, warm, actionable
sentence in the user's language"}

If the entry is unclear, set numbers to 0 and use the insight field to ask
one simple clarifying question.`;

/**
 * Parse a bookkeeping entry via Claude.
 * @param {string} entry - Raw user text
 * @returns {Promise<{items, total_cost, total_revenue, profit, insight}>}
 */
async function parseEntry(entry) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: entry }],
  });

  const raw = message.content[0].text.replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

/**
 * Generate a weekly coaching insight from a summary of records.
 * @param {string} summary - Plain-text summary of the week's records
 * @returns {Promise<string>}
 */
async function weeklyInsight(summary) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `You are Injiza, a warm bookkeeping coach for Rwandan micro-businesses. 
Given this week's records: ${summary}
Give ONE warm, specific, actionable coaching sentence in plain text (no JSON, no bullet points).`,
      },
    ],
  });
  return message.content[0].text.trim();
}

module.exports = { parseEntry, weeklyInsight };
