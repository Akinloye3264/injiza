import { useEffect, useRef, useState } from "react";
import type { BookkeepingRecord } from "../types";
import { countUp, animateArc, staggerCards, animateBars } from "../anim";
import { getWeeklyInsight, loanScore } from "../api";

interface Props {
  records: BookkeepingRecord[];
  onSubmit: (entry: string) => Promise<BookkeepingRecord>;
  loading: boolean;
  error: string;
}

const CIRC = 2 * Math.PI * 28; // r=28

// ── SVG icons ────────────────────────────────────────────────────────────────
const IconTrending = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const IconAward = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);
const IconLightbulb = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);
const IconPen = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IconInbox = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);
const IconAlert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default function AppSkin({ records, onSubmit, loading, error }: Props) {
  const [input, setInput] = useState("");
  const [weekInsight, setWeekInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);

  const totalProfit = records.reduce((s, r) => s + r.profit, 0);
  const score = loanScore(records.length, totalProfit);

  // Count-up profit
  const profitRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!profitRef.current) return;
    const anim = countUp(totalProfit, (v) => {
      if (profitRef.current) profitRef.current.textContent = v.toLocaleString();
    });
    return () => anim.pause();
  }, [totalProfit]);

  // Count-up entries
  const entriesRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!entriesRef.current) return;
    const anim = countUp(records.length, (v) => {
      if (entriesRef.current) entriesRef.current.textContent = String(v);
    });
    return () => anim.pause();
  }, [records.length]);

  // Loan ring
  const arcRef = useRef<SVGCircleElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (arcRef.current) animateArc(arcRef.current as unknown as SVGElement, score, CIRC);
    if (scoreRef.current) {
      const anim = countUp(score, (v) => {
        if (scoreRef.current) scoreRef.current.textContent = String(v);
      });
      return () => anim.pause();
    }
  }, [score]);

  // Stagger entry cards
  useEffect(() => {
    if (records.length > 0) staggerCards(".entry-card");
  }, [records.length]);

  // Animate bars
  useEffect(() => {
    if (records.length > 0) animateBars(".chart-bar");
  }, [records.length]);

  async function submit(text: string) {
    if (!text.trim() || loading) return;
    setInput("");
    await onSubmit(text.trim());
  }

  async function fetchWeekInsight() {
    if (!records.length) return;
    setInsightLoading(true);
    try {
      const insight = await getWeeklyInsight(records);
      setWeekInsight(insight);
    } catch {
      setWeekInsight("Ntabwo byakunze. Ongera ugerageze.");
    } finally {
      setInsightLoading(false);
    }
  }

  const maxAbs = Math.max(...records.map((r) => Math.abs(r.profit)), 1);
  const chartH = 80;

  return (
    <div className="app-skin">

      {/* ── Stat tiles ── */}
      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="tile-icon"><IconTrending /></div>
          <div className="tile-label">Total Profit</div>
          <div className={`tile-value ${totalProfit >= 0 ? "positive" : "negative"}`}>
            <span ref={profitRef}>{totalProfit.toLocaleString()}</span>
          </div>
          <div className="tile-sub">Rwandan Francs</div>
        </div>

        <div className="stat-tile">
          <div className="tile-icon"><IconList /></div>
          <div className="tile-label">Entries</div>
          <div className="tile-value">
            <span ref={entriesRef}>{records.length}</span>
          </div>
          <div className="tile-sub">recorded transactions</div>
        </div>

        <div className="stat-tile loan-tile">
          <div className="loan-ring-wrap">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                ref={arcRef}
                cx="36" cy="36" r="28"
                fill="none"
                stroke="var(--amber)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC}
              />
            </svg>
            <div className="loan-ring-label"><span ref={scoreRef}>0</span></div>
          </div>
          <div className="loan-info">
            <div className="tile-icon" style={{ marginBottom: 8 }}><IconAward /></div>
            <div className="tile-label">Loan Readiness</div>
            <div className="loan-illustrative">Illustrative score only — not a real credit rating</div>
          </div>
        </div>
      </div>

      {/* ── Input ── */}
      {error && (
        <div className="error-banner">
          <IconAlert /> {error}
        </div>
      )}
      <div className="input-row">
        <div className="input-wrap">
          <IconPen />
          <input
            type="text"
            placeholder="naguze ibirayi 5000, nagurishije 7000…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(input)}
            disabled={loading}
            aria-label="Enter bookkeeping record"
          />
        </div>
        <button className="btn-primary" onClick={() => submit(input)} disabled={loading || !input.trim()}>
          <IconSend />
          {loading ? "Parsing…" : "Add Entry"}
        </button>
      </div>

      {/* ── Weekly insight ── */}
      <div className="insight-section">
        <button className="btn-insight" onClick={fetchWeekInsight} disabled={insightLoading || !records.length}>
          <IconLightbulb />
          {insightLoading ? "Generating insight…" : "Get this week's coaching insight"}
        </button>
        {weekInsight && (
          <div className="insight-card">
            <IconLightbulb />
            {weekInsight}
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      {records.length > 0 && (
        <div className="chart-section">
          <div className="section-eyebrow">
            <IconBarChart /> Profit history
          </div>
          <div className="chart-wrap">
            <svg
              width="100%"
              height={chartH + 24}
              viewBox={`0 0 ${Math.max(records.length * 44, 320)} ${chartH + 24}`}
              preserveAspectRatio="none"
            >
              {records.map((r, i) => {
                const barH = Math.max(4, (Math.abs(r.profit) / maxAbs) * chartH);
                const x = i * 44 + 10;
                const y = r.profit >= 0 ? chartH - barH : chartH;
                return (
                  <rect
                    key={r.ts}
                    className="chart-bar"
                    x={x} y={y}
                    width={28} height={barH}
                    rx={4}
                    fill={r.profit >= 0 ? "var(--amber)" : "var(--red)"}
                    opacity={0.8}
                  />
                );
              })}
              <line x1="0" y1={chartH} x2="100%" y2={chartH} stroke="var(--border)" strokeWidth="1" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Entry cards ── */}
      <div className="entries-section">
        <div className="entries-header">
          <div className="section-eyebrow" style={{ marginBottom: 0 }}>
            <IconList /> Records
          </div>
          {records.length > 0 && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
              {records.length} {records.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>

        {records.length === 0 ? (
          <div className="empty-state">
            <IconInbox />
            No records yet. Add an entry above or tap an example chip.
          </div>
        ) : (
          [...records].reverse().map((r) => {
            const sign = r.profit >= 0 ? "+" : "";
            return (
              <div key={r.ts} className="entry-card">
                <div className="entry-card-top">
                  <div className="entry-text">"{r.entry}"</div>
                  <div className={`entry-profit-badge ${r.profit >= 0 ? "positive" : "negative"}`}>
                    {sign}{r.profit.toLocaleString()} RWF
                  </div>
                </div>
                <div className="entry-meta">
                  <span>Cost: <span>{r.total_cost.toLocaleString()} RWF</span></span>
                  <span>Revenue: <span>{r.total_revenue.toLocaleString()} RWF</span></span>
                </div>
                <div className="entry-insight">
                  <IconLightbulb />
                  {r.insight}
                </div>
                <div className="entry-time">{new Date(r.ts).toLocaleString("en-RW")}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
