// Neon PostgreSQL connection + query helpers
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

pool.on("error", (err) => console.error("DB pool error:", err));

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id            SERIAL PRIMARY KEY,
      phone         TEXT        NOT NULL DEFAULT 'demo',
      channel       TEXT        NOT NULL DEFAULT 'web',
      entry         TEXT        NOT NULL,
      items         JSONB,
      total_cost    INTEGER     NOT NULL DEFAULT 0,
      total_revenue INTEGER     NOT NULL DEFAULT 0,
      profit        INTEGER     NOT NULL DEFAULT 0,
      insight       TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS records_phone_idx ON records (phone);
    CREATE INDEX IF NOT EXISTS records_phone_date_idx ON records (phone, created_at DESC);
  `);
  console.log("  DB ready         →  Neon PostgreSQL");
}

/**
 * Persist one parsed bookkeeping record.
 * @returns {Promise<{id: number, created_at: string}>}
 */
async function saveRecord({ phone = "demo", channel = "web", entry, items = [], total_cost, total_revenue, profit, insight }) {
  const res = await pool.query(
    `INSERT INTO records (phone, channel, entry, items, total_cost, total_revenue, profit, insight)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, created_at`,
    [phone, channel, entry, JSON.stringify(items), total_cost, total_revenue, profit, insight]
  );
  return res.rows[0];
}

/**
 * Load records for a phone number, newest first.
 * @param {string} phone
 * @param {number} limit
 */
async function getRecords(phone, limit = 100) {
  const res = await pool.query(
    `SELECT * FROM records WHERE phone = $1 ORDER BY created_at DESC LIMIT $2`,
    [phone, limit]
  );
  return res.rows;
}

/**
 * Today's records for a phone (midnight UTC to now).
 */
async function getTodayRecords(phone) {
  const res = await pool.query(
    `SELECT * FROM records
     WHERE phone = $1
       AND created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Africa/Kigali')
     ORDER BY created_at DESC`,
    [phone]
  );
  return res.rows;
}

module.exports = { initDB, saveRecord, getRecords, getTodayRecords };
