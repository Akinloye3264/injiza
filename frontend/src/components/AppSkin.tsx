import { useEffect, useRef, useState } from "react";
import type { BookkeepingRecord } from "../types";
import type { Lang } from "../i18n";
import { t } from "../i18n";
import { countUp, animateArc, staggerCards, animateBars } from "../anim";
import { getWeeklyInsight, loanScore } from "../api";

interface Props {
  records: BookkeepingRecord[];
  onSubmit: (entry: string) => Promise<BookkeepingRecord>;
  loading: boolean;
  error: string;
  lang: Lang;
}

const CIRC = 2 * Math.PI * 28; // r=28

// Strip dangerous special characters; allow letters, digits, safe punctuation.
const FORBIDDEN = /[^a-zA-ZÀ-ɏƀ-ɏ\s\d,.''\-]/g;

function sanitize(val: string): string {
  return val.replace(FORBIDDEN, "");
}

/**
 * A valid bookkeeping entry must have:
 *  - at least one letter (item description)
 *  - at least one digit  (an amount)
 *  - at least 5 characters total
 * Returns a validation error string, or "" when valid.
 */
function validateEntry(val: string): string {
  const v = val.trim();
  if (v.length < 5)                   return "Entry is too short — describe what you bought or sold.";
  if (!/[a-zA-ZÀ-ɏƀ-ɏ]/.test(v))     return "Include an item name (e.g. potatoes, ibirayi).";
  if (!/\d/.test(v))                  return "Include the amount in RWF (e.g. 5000).";
  return "";
}

// ── Speech helpers ─────────────────────────────────────────────────────────

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: ((e: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function getSR(): RecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null) as RecognitionCtor | null;
}

function hasTTS(): boolean { return "speechSynthesis" in window; }

function speak(text: string, lang: Lang) {
  if (!hasTTS()) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang === "rw" ? "rw-RW" : "en-US";
  utt.rate = 0.91;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

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
const IconMic = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const IconVolume = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const IconMicOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

export default function AppSkin({ records, onSubmit, loading, error, lang }: Props) {
  const [input, setInput]             = useState("");
  const [validationMsg, setValidationMsg] = useState("");
  const [weekInsight, setWeekInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [voiceState, setVoiceState]   = useState<"idle" | "listening" | "error">("idle");

  const recognitionRef = useRef<{ stop(): void } | null>(null);
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const s = t[lang];

  const totalProfit = records.reduce((sum, r) => sum + r.profit, 0);
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

  // Stop recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  // ── Input change with strict validation ──────────────────────────────────
  function handleInputChange(val: string) {
    const cleaned = sanitize(val);
    if (cleaned !== val) {
      setValidationMsg(s.voice_validation_err);
      if (validationTimer.current) clearTimeout(validationTimer.current);
      validationTimer.current = setTimeout(() => setValidationMsg(""), 2200);
    }
    setInput(cleaned);
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (validateEntry(trimmed)) return;   // blocked: invalid syntax
    setInput("");
    try {
      const record = await onSubmit(trimmed);
      if (record?.insight) speak(record.insight, lang);
    } catch {
      // error already surfaced via App.tsx → error prop
    }
  }

  // ── Weekly insight ────────────────────────────────────────────────────────
  async function fetchWeekInsight() {
    if (!records.length) return;
    setInsightLoading(true);
    try {
      const insight = await getWeeklyInsight(records);
      setWeekInsight(insight);
      speak(insight, lang);
    } catch {
      setWeekInsight(s.error_generic);
    } finally {
      setInsightLoading(false);
    }
  }

  // ── Voice input ───────────────────────────────────────────────────────────
  function startVoice() {
    const SR = getSR();
    if (!SR) { setVoiceState("error"); return; }

    const rec = new SR();
    rec.lang = lang === "rw" ? "rw-RW" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      handleInputChange(transcript);
      setVoiceState("idle");
    };
    rec.onerror = () => setVoiceState("error");
    rec.onend   = () => setVoiceState("idle");

    recognitionRef.current = rec;
    rec.start();
    setVoiceState("listening");
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setVoiceState("idle");
  }

  const voiceSupported = !!getSR();

  const maxAbs = Math.max(...records.map((r) => Math.abs(r.profit)), 1);
  const chartH = 80;

  return (
    <div className="app-skin">

      {/* ── Stat tiles ── */}
      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="tile-icon"><IconTrending /></div>
          <div className="tile-label">{s.profit}</div>
          <div className={`tile-value ${totalProfit >= 0 ? "positive" : "negative"}`}>
            <span ref={profitRef}>{totalProfit.toLocaleString()}</span>
          </div>
          <div className="tile-sub">{s.currency_label}</div>
        </div>

        <div className="stat-tile">
          <div className="tile-icon"><IconList /></div>
          <div className="tile-label">{s.entries}</div>
          <div className="tile-value">
            <span ref={entriesRef}>{records.length}</span>
          </div>
          <div className="tile-sub">{s.recorded_tx}</div>
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
            <div className="tile-label">{s.loan_readiness}</div>
            <div className="loan-illustrative">{s.illustrative_note}</div>
          </div>
        </div>
      </div>

      {/* ── Error / validation banners ── */}
      {error && (
        <div className="error-banner">
          <IconAlert /> {error}
        </div>
      )}
      {validationMsg && (
        <div className="validation-banner">
          <IconAlert /> {validationMsg}
        </div>
      )}

      {/* ── Input row ── */}
      {(() => {
        const entryErr = input.trim() ? validateEntry(input) : "";
        const canSubmit = !!input.trim() && !entryErr;
        return (
          <>
            <div className="input-row">
              <div className={`input-wrap ${entryErr ? "input-invalid" : input.trim() && !entryErr ? "input-valid" : ""}`}>
                <IconPen />
                <input
                  type="text"
                  placeholder={s.placeholder_app}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit(input)}
                  disabled={loading}
                  aria-label="Enter bookkeeping record"
                  aria-invalid={!!entryErr}
                />
                {voiceSupported && (
                  <button
                    className={`btn-mic ${voiceState === "listening" ? "listening" : ""} ${voiceState === "error" ? "mic-error" : ""}`}
                    onClick={voiceState === "listening" ? stopVoice : startVoice}
                    disabled={loading}
                    title={voiceState === "listening" ? s.voice_stop : s.voice_start}
                    aria-label={voiceState === "listening" ? s.voice_stop : s.voice_start}
                  >
                    {voiceState === "listening" ? <IconMicOff /> : <IconMic />}
                  </button>
                )}
              </div>
              <button className="btn-primary" onClick={() => submit(input)} disabled={loading || !canSubmit}>
                <IconSend />
                {loading ? s.parsing : s.add_entry}
              </button>
            </div>
            {entryErr && (
              <div className="entry-hint">
                <IconAlert /> {entryErr}
              </div>
            )}
          </>
        );
      })()}

      {/* Voice state label */}
      {voiceState === "listening" && (
        <div className="voice-listening-label">
          <span className="voice-pulse" />
          {s.voice_listening}
        </div>
      )}
      {voiceState === "error" && (
        <div className="validation-banner"><IconAlert /> {s.voice_not_supported}</div>
      )}

      {/* ── Weekly insight ── */}
      <div className="insight-section">
        <button className="btn-insight" onClick={fetchWeekInsight} disabled={insightLoading || !records.length}>
          <IconLightbulb />
          {insightLoading ? s.generating : s.get_insight_btn}
        </button>
        {weekInsight && (
          <div className="insight-card">
            <IconLightbulb />
            <span style={{ flex: 1 }}>{weekInsight}</span>
            {hasTTS() && (
              <button className="btn-voice-read" onClick={() => speak(weekInsight, lang)} title={s.voice_read} aria-label={s.voice_read}>
                <IconVolume />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      {records.length > 0 && (
        <div className="chart-section">
          <div className="section-eyebrow">
            <IconBarChart /> {s.profit_history}
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
            <IconList /> {s.records_title}
          </div>
          {records.length > 0 && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
              {records.length} {records.length === 1 ? s.entry_one : s.entries_many}
            </span>
          )}
        </div>

        {records.length === 0 ? (
          <div className="empty-state">
            <IconInbox />
            {s.no_records}
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
                  <span>{s.cost}: <span>{r.total_cost.toLocaleString()} RWF</span></span>
                  <span>{s.revenue}: <span>{r.total_revenue.toLocaleString()} RWF</span></span>
                </div>
                <div className="entry-insight">
                  <IconLightbulb />
                  <span style={{ flex: 1 }}>{r.insight}</span>
                  {hasTTS() && (
                    <button className="btn-voice-read" onClick={() => speak(r.insight, lang)} title={s.voice_read} aria-label={s.voice_read}>
                      <IconVolume />
                    </button>
                  )}
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
