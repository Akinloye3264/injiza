import { useEffect, useRef, useState } from "react";
import type { BookkeepingRecord } from "./types";
import type { Lang } from "./i18n";
import { t } from "./i18n";
import { callClaude } from "./api";
import { morphBlob, animateHeroEntrance } from "./anim";
import AppSkin from "./components/AppSkin";
import UssdSimulator from "./components/UssdSimulator";
import "./styles/global.css";

type Tab = "dashboard" | "ussd";

const IconPlay = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconGrid = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const IconPhone = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);
const IconSignal = () => (
  <svg width="16" height="12" viewBox="0 0 24 18" fill="currentColor">
    <rect x="0"  y="12" width="4" height="6" rx="1" opacity="0.4"/>
    <rect x="6"  y="8"  width="4" height="10" rx="1" opacity="0.65"/>
    <rect x="12" y="4"  width="4" height="14" rx="1" opacity="0.85"/>
    <rect x="18" y="0"  width="4" height="18" rx="1"/>
  </svg>
);
const IconBattery = () => (
  <svg width="22" height="12" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="20" height="12" rx="2.5"/>
    <rect x="2" y="2" width="14" height="10" rx="1.5" fill="currentColor" stroke="none"/>
    <path d="M22 5v4" strokeLinecap="round"/>
  </svg>
);

export default function App() {
  const [lang, setLang]           = useState<Lang>("en");
  const [records, setRecords]     = useState<BookkeepingRecord[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [time, setTime]           = useState(() =>
    new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
  );

  const glowRef     = useRef<HTMLDivElement>(null);
  const titleRef    = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const phoneRef    = useRef<HTMLDivElement>(null);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() =>
      setTime(new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }))
    , 60_000);
    return () => clearInterval(id);
  }, []);

  // Glow morph + hero entrance
  useEffect(() => {
    if (glowRef.current)     morphBlob(glowRef.current, 0);
    if (titleRef.current && subtitleRef.current)
      animateHeroEntrance(subtitleRef.current, titleRef.current);
  }, []);

  function openTab(tab: Tab) {
    setActiveTab(tab);
    phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(entry: string): Promise<BookkeepingRecord> {
    setLoading(true);
    setError("");
    try {
      const parsed = await callClaude(entry);
      const record: BookkeepingRecord = { ...parsed, entry, ts: Date.now() };
      setRecords((prev) => [...prev, record]);
      return record;
    } catch (e) {
      const msg = e instanceof Error ? e.message : t[lang].error_generic;
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-wrapper">

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <section className="hero">
        <div className="hero-glow" ref={glowRef} />

        <div className="hero-lang" role="group" aria-label="Language">
          <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")} aria-pressed={lang === "en"}>EN</button>
          <button className={`lang-btn ${lang === "rw" ? "active" : ""}`} onClick={() => setLang("rw")} aria-pressed={lang === "rw"}>KIN</button>
        </div>

        <div className="hero-demo-badge" onClick={() => openTab("dashboard")} role="button" tabIndex={0}>
          Demo <IconChevron />
        </div>

        <div className="hero-content">
          <h1 className="hero-title" ref={titleRef}>
            Making Income<br />
            Visible,<br />
            for Everyone
          </h1>
          <div className="hero-subtitle" ref={subtitleRef}>
            <span className="hero-arrow">↗</span>
            <p className="hero-subtitle-text">{t[lang].hero_subtitle}</p>
          </div>
          <div className="hero-actions">
            <button className={`btn-hero-dark ${activeTab === "dashboard" ? "selected" : ""}`} onClick={() => openTab("dashboard")}>
              {t[lang].tab_bookkeeping}
            </button>
            <button className="btn-hero-white" onClick={() => openTab("ussd")}>
              {t[lang].tab_ussd}
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          PHONE MOCKUP — both tabs live here
      ═══════════════════════════════════════ */}
      <div className="phone-demo-section" ref={phoneRef}>
        <div className="phone-mockup">

          {/* Dynamic island */}
          <div className="phone-island" />

          {/* Screen */}
          <div className="phone-screen-wrap">

            {/* Status bar */}
            <div className="phone-status-bar">
              <span className="phone-status-time">{time}</span>
              <div className="phone-status-icons">
                <IconSignal />
                <IconBattery />
              </div>
            </div>

            {/* Scrollable content */}
            <div className="phone-content-area">
              {activeTab === "dashboard" && (
                <>
                  {/* In-phone mini header */}
                  <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "0.1em", color: "#fff", fontFamily: "var(--font-body)" }}>INJIZA</span>
                    <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.06)", borderRadius: 50, padding: "2px 3px" }}>
                      <button className={`lang-btn ${lang === "en" ? "active" : ""}`} style={{ fontSize: "0.62rem", padding: "3px 10px" }} onClick={() => setLang("en")}>EN</button>
                      <button className={`lang-btn ${lang === "rw" ? "active" : ""}`} style={{ fontSize: "0.62rem", padding: "3px 10px" }} onClick={() => setLang("rw")}>KIN</button>
                    </div>
                  </div>

                  {/* Example chips inside phone */}
                  <div style={{ padding: "10px 14px 0" }}>
                    <div className="section-eyebrow" style={{ marginBottom: 7 }}><IconPlay /> {t[lang].try_example}</div>
                    <div className="examples-row" style={{ marginBottom: 0 }}>
                      {t[lang].chips.map((chip) => (
                        <button key={chip.full} className="chip" title={chip.full} onClick={() => handleSubmit(chip.full)} disabled={loading}>
                          <IconPlay />{chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AppSkin
                    records={records}
                    onSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                    lang={lang}
                  />
                </>
              )}

              {activeTab === "ussd" && (
                <UssdSimulator lang={lang} inlineMode />
              )}
            </div>

            {/* Bottom tab bar */}
            <div className="phone-tab-bar">
              <button className={`phone-tab ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
                <IconGrid />
                {t[lang].tab_bookkeeping}
              </button>
              <button className={`phone-tab ${activeTab === "ussd" ? "active" : ""}`} onClick={() => setActiveTab("ussd")}>
                <IconPhone />
                {t[lang].tab_ussd}
              </button>
            </div>

          </div>{/* end phone-screen-wrap */}

          {/* Home indicator */}
          <div className="phone-home-bar">
            <div className="phone-home-pill" />
          </div>

        </div>
      </div>

    </div>
  );
}
