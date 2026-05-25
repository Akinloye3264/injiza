require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { handleUSSD } = require("./ussd");
const { parseEntry, weeklyInsight } = require("./claude");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Swagger / OpenAPI setup ──────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Injiza API",
      version: "1.0.0",
      description:
        "AI-powered bookkeeping backend for Rwanda's informal micro-businesses. " +
        "Exposes a USSD callback for Africa's Talking and REST endpoints for the web dashboard.",
    },
    servers: [
      { url: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`, description: "Active server" },
      { url: "http://localhost:3001", description: "Local dev" },
    ],
    tags: [
      { name: "USSD", description: "Africa's Talking USSD callback" },
      { name: "AI", description: "Claude-powered bookkeeping endpoints" },
      { name: "System", description: "Health & status" },
    ],
  },
  apis: ["./src/server.js"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { background: #0f1b2d; }
    .swagger-ui .topbar-wrapper img { display: none; }
    .swagger-ui .topbar-wrapper::before {
      content: "INJIZA API";
      color: #a78bfa;
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: 0.1em;
    }
    body { background: #0f1b2d; }
    .swagger-ui { color: #e2e8f0; }
    .swagger-ui .info .title { color: #a78bfa; }
  `,
  customSiteTitle: "Injiza API Docs",
}));

// Expose raw spec as JSON for external tools
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// ─── Root — so opening the URL in a browser doesn't show a blank 404 ─────────
/**
 * @openapi
 * /:
 *   get:
 *     tags: [System]
 *     summary: Root — confirms the server is reachable
 *     responses:
 *       200:
 *         description: Plain-text status page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get("/", (req, res) => {
  const host = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Injiza API</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#0c0f0d;color:#dde8df;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{background:#171c18;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:36px 40px;max-width:480px;width:100%}
.dot{display:inline-block;width:8px;height:8px;background:#86d29e;border-radius:50%;margin-right:8px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
h1{font-size:1.6rem;letter-spacing:0.12em;margin-bottom:4px}p{color:#7a9882;font-size:0.85rem;margin-bottom:24px}
.routes{display:flex;flex-direction:column;gap:8px}.route{display:flex;align-items:center;gap:10px;font-size:0.8rem}
.method{background:#1e3d2a;color:#86d29e;border:1px solid rgba(134,210,158,0.25);border-radius:4px;padding:2px 8px;font-weight:700;font-family:monospace;font-size:0.72rem;min-width:48px;text-align:center}
.method.post{background:#2a2010;color:#e9a825;border-color:rgba(233,168,37,0.25)}
a{color:#86d29e;text-decoration:none;font-size:0.8rem}.divider{height:1px;background:rgba(255,255,255,0.07);margin:20px 0}
</style></head><body><div class="card">
<h1><span class="dot"></span>INJIZA</h1>
<p>AI-powered bookkeeping backend — server is running</p>
<div class="routes">
  <div class="route"><span class="method post">POST</span><span>/ussd — Africa's Talking USSD callback</span></div>
  <div class="route"><span class="method post">POST</span><span>/api/parse — parse a bookkeeping entry</span></div>
  <div class="route"><span class="method post">POST</span><span>/api/weekly-insight — weekly coaching</span></div>
  <div class="route"><span class="method">GET</span><span>/health — health check</span></div>
</div>
<div class="divider"></div>
<a href="/api-docs">Open Swagger docs →</a>
</div></body></html>`);
});

// ─── USSD Callback ────────────────────────────────────────────────────────────
/**
 * @openapi
 * /ussd:
 *   post:
 *     tags: [USSD]
 *     summary: Africa's Talking USSD callback
 *     description: |
 *       **Set this URL as your callback in the Africa's Talking dashboard.**
 *
 *       Africa's Talking POSTs form-encoded data on every USSD interaction.
 *       Respond with plain text starting with `CON ` (continue) or `END ` (terminate).
 *
 *       ### USSD Menu Flow
 *       ```
 *       Dial shortcode
 *         → Main menu
 *             1. Injiza ibyagurishijwe  → type entry → AI parses → profit + insight
 *             2. Reba inyungu           → shows total profit for this session
 *             3. Inama y'icyumweru      → AI weekly coaching sentence
 *             4. Sohoka                → end session
 *       ```
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [sessionId, phoneNumber]
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "ATUid_abc123"
 *                 description: Unique session ID from Africa's Talking
 *               serviceCode:
 *                 type: string
 *                 example: "*384*123#"
 *                 description: Your registered USSD shortcode
 *               phoneNumber:
 *                 type: string
 *                 example: "+250788123456"
 *                 description: Caller's phone number (E.164 format)
 *               text:
 *                 type: string
 *                 example: "1*naguze ibirayi 5000, nagurishije 7000"
 *                 description: |
 *                   Cumulative input chain, separated by `*`.
 *                   Empty string on first dial.
 *     responses:
 *       200:
 *         description: USSD response string
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             examples:
 *               menu:
 *                 summary: Main menu (CON)
 *                 value: "CON Murakaza neza kuri INJIZA\n1. Injiza ibyagurishijwe\n2. Reba inyungu\n3. Inama y'icyumweru\n4. Sohoka"
 *               result:
 *                 summary: Entry parsed (END)
 *                 value: "END Byafashwe!\nInyungu: +2,000 RWF\nKeep tracking daily — small profits add up fast!"
 *       400:
 *         description: Missing required fields
 */
app.post("/ussd", async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  if (!sessionId || !phoneNumber) {
    return res.status(400).send("END Invalid request");
  }
  try {
    const response = await handleUSSD({ sessionId, phoneNumber, text: text || "" });
    res.set("Content-Type", "text/plain");
    res.send(response);
  } catch (err) {
    console.error("USSD handler error:", err);
    res.set("Content-Type", "text/plain");
    res.send("END Hari ikibazo. Ongera ugerageze.");
  }
});

// ─── REST: Parse entry ────────────────────────────────────────────────────────
/**
 * @openapi
 * /api/parse:
 *   post:
 *     tags: [AI]
 *     summary: Parse a bookkeeping entry via Claude
 *     description: |
 *       Accepts a raw text entry in Kinyarwanda, English, or a mix.
 *       Returns structured bookkeeping data + a short coaching insight.
 *
 *       **Examples you can try:**
 *       - `naguze ibirayi 5000, nagurishije 7000`
 *       - `bought tomatoes 8000, sold for 6500`
 *       - `cut hair 5 people, 1000 each, paid 800 for clippers`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entry]
 *             properties:
 *               entry:
 *                 type: string
 *                 example: "naguze ibirayi 5000, nagurishije 7000"
 *     responses:
 *       200:
 *         description: Parsed bookkeeping record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParsedEntry'
 *             example:
 *               items:
 *                 - name: "ibirayi (potatoes)"
 *                   cost: 5000
 *                   revenue: 7000
 *               total_cost: 5000
 *               total_revenue: 7000
 *               profit: 2000
 *               insight: "Great margin on potatoes — consider buying a larger batch tomorrow!"
 *       400:
 *         description: Missing entry field
 *       500:
 *         description: Claude API error
 */
app.post("/api/parse", async (req, res) => {
  const { entry } = req.body;
  if (!entry) return res.status(400).json({ error: "entry is required" });
  try {
    const result = await parseEntry(entry);
    res.json(result);
  } catch (err) {
    console.error("Parse error:", err);
    res.status(500).json({ error: "Failed to parse entry. Please try again." });
  }
});

// ─── REST: Weekly insight ─────────────────────────────────────────────────────
/**
 * @openapi
 * /api/weekly-insight:
 *   post:
 *     tags: [AI]
 *     summary: Generate a weekly coaching insight
 *     description: |
 *       Send a plain-text summary of the week's records.
 *       Returns ONE warm, specific, actionable coaching sentence.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [summary]
 *             properties:
 *               summary:
 *                 type: string
 *                 example: '"naguze ibirayi 5000, nagurishije 7000" → profit 2000 RWF; "bought tomatoes 8000, sold for 6500" → profit -1500 RWF'
 *     responses:
 *       200:
 *         description: Weekly insight
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 insight:
 *                   type: string
 *                   example: "Your potato sales are your strongest product — double down on that stock this week."
 *       400:
 *         description: Missing summary field
 *       500:
 *         description: Claude API error
 */
app.post("/api/weekly-insight", async (req, res) => {
  const { summary } = req.body;
  if (!summary) return res.status(400).json({ error: "summary is required" });
  try {
    const insight = await weeklyInsight(summary);
    res.json({ insight });
  } catch (err) {
    console.error("Weekly insight error:", err);
    res.status(500).json({ error: "Failed to generate insight." });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: injiza-backend
 */
app.get("/health", (_req, res) => res.json({ status: "ok", service: "injiza-backend" }));

// ─── Shared schemas ───────────────────────────────────────────────────────────
/**
 * @openapi
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "ibirayi (potatoes)"
 *         cost:
 *           type: number
 *           example: 5000
 *         revenue:
 *           type: number
 *           example: 7000
 *     ParsedEntry:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Item'
 *         total_cost:
 *           type: number
 *           example: 5000
 *         total_revenue:
 *           type: number
 *           example: 7000
 *         profit:
 *           type: number
 *           example: 2000
 *         insight:
 *           type: string
 *           example: "Great margin — consider buying a larger batch tomorrow!"
 */

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  Injiza backend  →  http://localhost:${PORT}`);
  console.log(`  Swagger docs    →  http://localhost:${PORT}/api-docs`);
  console.log(`  USSD callback   →  http://localhost:${PORT}/ussd\n`);
});
