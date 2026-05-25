import { useEffect, useRef, useState } from "react";
import type { BookkeepingRecord } from "./types";
import type { Lang } from "./i18n";
import { t } from "./i18n";
import { callClaude } from "./api";
import { revealPageElements, skinIn } from "./anim";
import AppSkin from "./components/AppSkin";
import UssdSimulator from "./components/UssdSimulator";
import "./styles/global.css";

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
  const [lang, setLang] = useState<Lang>("en");
  const [records, setRecords] = useState<BookkeepingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    revealPageElements(".header, .header-divider, .examples-section");
    if (contentRef.current) skinIn(contentRef.current);
  }, []);

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

      <header className="header" style={{ opacity: 0 }}>
        <div className="header-left">
          <h1 className="wordmark">
            INJ<span className="wordmark-accent">IZ</span>A<span className="wordmark-dot" aria-hidden="true" />
          </h1>
          <p className="tagline">kwinjiza amafaranga · making income visible</p>
        </div>
        <div className="header-right">
          <div className="lang-toggle" role="group" aria-label="Select language">
            <button
              className={`lang-btn ${lang === "en" ? "active" : ""}`}
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
            >EN</button>
            <button
              className={`lang-btn ${lang === "rw" ? "active" : ""}`}
              onClick={() => setLang("rw")}
              aria-pressed={lang === "rw"}
            >KIN</button>
          </div>
          <div className="header-badge">
            <IconZap /> Powered by Claude AI
          </div>
        </div>
      </header>

      <div className="header-divider" style={{ opacity: 0 }} />

      <div className="examples-section" style={{ opacity: 0 }}>
        <div className="section-eyebrow"><IconPlay /> {t[lang].try_example}</div>
        <div className="examples-row">
          {t[lang].chips.map((chip) => (
            <button
              key={chip.full}
              className="chip"
              title={chip.full}
              onClick={() => handleSubmit(chip.full)}
              disabled={loading}
            >
              <IconPlay />{chip.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={contentRef} style={{ opacity: 0 }}>
        <AppSkin
          records={records}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          lang={lang}
        />
        <UssdSimulator lang={lang} />
      </div>

    </div>
  );
}
