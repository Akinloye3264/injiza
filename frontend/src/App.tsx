import { useEffect, useRef, useState } from "react";
import type { BookkeepingRecord, Skin } from "./types";
import { callClaude, EXAMPLES } from "./api";
import { revealPageElements, slideIndicator, skinOut, skinIn } from "./anim";
import UssdInfoPanel from "./components/UssdInfoPanel";
import AppSkin from "./components/AppSkin";
import "./styles/global.css";

const IconGrid = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/>
    <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const IconZap = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconPlay = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

export default function App() {
  const [skin, setSkin] = useState<Skin>("app");
  const [records, setRecords] = useState<BookkeepingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const indicatorRef = useRef<HTMLDivElement>(null);
  const skinContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    revealPageElements(".header, .header-divider, .toggle-wrap, .examples-section");
    if (skinContainerRef.current) skinIn(skinContainerRef.current);
    // indicator starts on left (app tab) — no translation needed
  }, []);

  async function switchSkin(next: Skin) {
    if (next === skin) return;
    if (skinContainerRef.current) {
      await skinOut(skinContainerRef.current).finished;
    }
    setSkin(next);
    if (indicatorRef.current) {
      const parent = indicatorRef.current.parentElement;
      const w = parent ? parent.offsetWidth / 2 : 130;
      slideIndicator(indicatorRef.current, next === "ussd" ? w - 3 : 0);
    }
  }

  useEffect(() => {
    if (skinContainerRef.current) skinIn(skinContainerRef.current);
  }, [skin]);

  async function handleSubmit(entry: string): Promise<BookkeepingRecord> {
    setLoading(true);
    setError("");
    try {
      const parsed = await callClaude(entry);
      const record: BookkeepingRecord = { ...parsed, entry, ts: Date.now() };
      setRecords((prev) => [...prev, record]);
      return record;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hari ikibazo. Ongera ugerageze.";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-wrapper">

      <header className="header" style={{ opacity: 0 }}>
        <div>
          <h1 className="wordmark">
            INJ<span className="wordmark-accent">IZ</span>A<span className="wordmark-dot" aria-hidden="true" />
          </h1>
          <p className="tagline">kwinjiza amafaranga · making income visible</p>
        </div>
        <div className="header-badge">
          <IconZap /> Powered by Claude AI
        </div>
      </header>

      <div className="header-divider" style={{ opacity: 0 }} />

      {/* Toggle — always visible, high contrast active state */}
      <div className="toggle-wrap" style={{ opacity: 0 }}>
        <span className="toggle-label">View</span>
        <div className="toggle" role="tablist" aria-label="Select view">
          <div className="toggle-indicator" ref={indicatorRef} />
          <button
            className={`toggle-btn ${skin === "app" ? "active" : ""}`}
            role="tab"
            aria-selected={skin === "app"}
            onClick={() => switchSkin("app")}
          >
            <IconGrid /> Dashboard
          </button>
          <button
            className={`toggle-btn ${skin === "ussd" ? "active" : ""}`}
            role="tab"
            aria-selected={skin === "ussd"}
            onClick={() => switchSkin("ussd")}
          >
            <IconPhone /> USSD
          </button>
        </div>
      </div>

      {/* Example chips — dashboard only */}
      {skin === "app" && (
        <div className="examples-section" style={{ opacity: 0 }}>
          <div className="section-eyebrow"><IconPlay /> Try an example</div>
          <div className="examples-row">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="chip" title={ex} onClick={() => handleSubmit(ex)} disabled={loading}>
                <IconPlay />{ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={skinContainerRef} style={{ opacity: 0 }}>
        {skin === "app" ? (
          <AppSkin records={records} onSubmit={handleSubmit} loading={loading} error={error} />
        ) : (
          <UssdInfoPanel />
        )}
      </div>

    </div>
  );
}
