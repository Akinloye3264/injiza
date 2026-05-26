import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { t } from "../i18n";

interface Props {
  lang: Lang;
  inlineMode?: boolean;
}

const BASE = import.meta.env.VITE_API_BASE ?? "";
const SERVICE_CODE = "*384*13766#";
const SIM_PHONE = "+250788000000";

type Phase = "idle" | "loading" | "session" | "ended" | "error";

const DIGIT_KEYS = [
  { k: "1", sub: "" },   { k: "2", sub: "ABC" }, { k: "3", sub: "DEF" },
  { k: "4", sub: "GHI" },{ k: "5", sub: "JKL" }, { k: "6", sub: "MNO" },
  { k: "7", sub: "PQRS"},{ k: "8", sub: "TUV" }, { k: "9", sub: "WXYZ"},
  { k: "*", sub: "" },   { k: "0", sub: "+" },    { k: "#", sub: "" },
];

function uid() { return `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }

function renderLine(line: string, idx: number, isFirst: boolean) {
  const menuMatch = line.match(/^(\d+)\.\s(.+)$/);
  if (menuMatch) return (
    <div key={idx} className="sim-line sim-menu-option">
      <span className="sim-menu-num">{menuMatch[1]}.</span>
      <span className="sim-menu-text">{menuMatch[2]}</span>
    </div>
  );
  if (!line.trim()) return <div key={idx} className="sim-line-gap" />;
  return <div key={idx} className={`sim-line ${isFirst ? "sim-line-title" : ""}`}>{line}</div>;
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.61 21 3 14.39 3 6.5a1 1 0 0 1 1-1H8a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.71 2.7z"/>
  </svg>
);
const IconPhoneOff = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a1 1 0 0 0-1.01.24l-1.57 1.97a15.88 15.88 0 0 1-6.91-6.91l1.97-1.58a1 1 0 0 0 .24-1c-.37-1.12-.56-2.3-.56-3.53a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1C3 13.54 8.46 19 15 19a1 1 0 0 0 1-1v-3a1 1 0 0 0-.99-1.01l-1-.01z M2.71 3.29L1.29 4.71l18 18 1.41-1.41z"/>
  </svg>
);
const IconSend = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconDelete = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
    <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
  </svg>
);

export default function UssdSimulator({ lang, inlineMode = false }: Props) {
  const s = t[lang];
  const [phase, setPhase]         = useState<Phase>("idle");
  const [sessionId, setSessionId] = useState("");
  const [textChain, setTextChain] = useState("");
  const [screenText, setScreenText] = useState("");
  const [inputBuf, setInputBuf]   = useState("");
  const [errMsg, setErrMsg]       = useState("");
  const [time, setTime]           = useState(() =>
    new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() =>
      setTime(new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }))
    , 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase === "session") inputRef.current?.focus();
  }, [phase]);

  function pressKey(k: string) {
    if (phase === "session") { setInputBuf((p) => p + k); inputRef.current?.focus(); }
  }
  function pressBackspace() { setInputBuf((p) => p.slice(0, -1)); }

  async function pressAction() {
    if (phase === "loading") return;
    if (phase === "idle") {
      const sid = uid();
      setSessionId(sid); setTextChain(""); setInputBuf(""); setErrMsg("");
      await callUssd(sid, ""); return;
    }
    if (phase === "session") {
      const reply = inputBuf.trim();
      if (!reply) return;
      const newChain = textChain === "" ? reply : `${textChain}*${reply}`;
      setInputBuf("");
      await callUssd(sessionId, newChain); return;
    }
    reset();
  }

  async function callUssd(sid: string, chain: string) {
    setPhase("loading");
    try {
      const res = await fetch(`${BASE}/ussd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, phoneNumber: SIM_PHONE, serviceCode: SERVICE_CODE, text: chain }),
      });
      const raw = await res.text();
      const isCon = raw.startsWith("CON ");
      const isEnd = raw.startsWith("END ");
      const body  = isCon ? raw.slice(4) : isEnd ? raw.slice(4) : raw;
      setTextChain(chain); setScreenText(body);
      setPhase(isEnd ? "ended" : "session");
    } catch {
      setErrMsg("Connection failed. Is the backend running?");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle"); setSessionId(""); setTextChain("");
    setScreenText(""); setInputBuf(""); setErrMsg("");
  }

  const isEnded = phase === "ended" || phase === "error";
  const actionLabel   = isEnded ? s.sim_hangup : phase === "session" ? s.sim_send : s.sim_call;
  const actionDisabled = phase === "loading" || (phase === "session" && !inputBuf.trim());
  const lines = screenText.split("\n");

  // ── Shared screen body content ──────────────────────────────────────────
  const screenContent = (
    <>
      {phase === "idle" && (
        <div className="screen-idle">
          <div className="idle-code">{SERVICE_CODE}</div>
          <div className="idle-hint">{s.sim_dial_hint}</div>
        </div>
      )}
      {phase === "loading" && (
        <div className="screen-loading">
          <div className="loading-dots"><span /><span /><span /></div>
          <div className="loading-label">{s.sim_connecting}</div>
        </div>
      )}
      {(phase === "session" || phase === "ended") && (
        <div className="screen-session">
          <div className="screen-scroll">
            {lines.map((line, i) => renderLine(line, i, i === 0))}
          </div>
          {phase === "ended" && <div className="screen-ended-badge">{s.sim_session_ended}</div>}
        </div>
      )}
      {phase === "error" && (
        <div className="screen-loading">
          <div className="screen-err-icon">✕</div>
          <div className="loading-label">{errMsg}</div>
        </div>
      )}
    </>
  );

  // ── Shared keypad ────────────────────────────────────────────────────────
  const keypad = (
    <div className={inlineMode ? "ussd-inline-keypad" : "phone-keypad"}>
      {DIGIT_KEYS.map(({ k, sub }) => (
        <button
          key={k}
          className={inlineMode
            ? `ussd-inline-key ${k === "*" || k === "#" ? "ussd-inline-key-sym" : ""}`
            : `sim-key ${k === "*" || k === "#" ? "sim-key-sym" : ""}`}
          onClick={() => pressKey(k)}
          disabled={phase === "loading" || phase === "ended" || phase === "error"}
        >
          <span className={inlineMode ? "ussd-inline-key-main" : "sim-key-main"}>{k}</span>
          {sub && <span className={inlineMode ? "ussd-inline-key-sub" : "sim-key-sub"}>{sub}</span>}
        </button>
      ))}

      {/* Backspace */}
      <button
        className={inlineMode ? "ussd-inline-key ussd-inline-key-del" : "sim-key sim-key-del"}
        onClick={pressBackspace}
        disabled={phase === "loading" || !inputBuf}
        aria-label="Delete"
      >
        <IconDelete />
      </button>

      {/* Action: Call / Send / Hang up */}
      <button
        className={inlineMode
          ? `ussd-inline-key ussd-inline-key-action ${isEnded ? "ussd-inline-key-hangup" : ""}`
          : `sim-key sim-key-action ${isEnded ? "sim-key-hangup" : ""}`}
        onClick={pressAction}
        disabled={actionDisabled}
      >
        {isEnded
          ? <><IconPhoneOff /> {actionLabel}</>
          : phase === "session"
            ? <><IconSend /> {actionLabel}</>
            : <><IconPhone /> {actionLabel}</>}
      </button>
    </div>
  );

  // ── INLINE MODE — no outer phone shell ──────────────────────────────────
  if (inlineMode) {
    return (
      <div className="ussd-inline">
        {/* Service code bar */}
        <div className="ussd-inline-bar">
          <span className="ussd-service-code">{SERVICE_CODE}</span>
          <span className="ussd-inline-time">{time}</span>
        </div>

        {/* Screen content */}
        <div className="ussd-inline-screen">{screenContent}</div>

        {/* Input row — only while session */}
        {phase === "session" && (
          <div className="ussd-inline-input-row">
            <span className="screen-prompt">›</span>
            <input
              ref={inputRef}
              className="screen-input"
              value={inputBuf}
              onChange={(e) => setInputBuf(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pressAction()}
              placeholder="type reply…"
              autoComplete="off" autoCorrect="off" spellCheck={false}
            />
          </div>
        )}

        {/* Keypad */}
        {keypad}
      </div>
    );
  }

  // ── STANDALONE MODE — original phone shell ───────────────────────────────
  return (
    <section className="ussd-sim-section">
      <div className="ussd-sim-header">
        <div className="section-eyebrow" style={{ marginBottom: 6 }}>
          <IconPhone /> {s.sim_eyebrow}
        </div>
        <p className="ussd-sim-desc">{s.sim_desc}</p>
      </div>

      <div className="ussd-sim-center">
        <div className="phone-shell">
          <div className="phone-notch" />

          <div className="phone-screen">
            <div className="screen-bar">
              <span className="screen-carrier">INJIZA</span>
              <span className="screen-signal">
                <span className="sig-bar" style={{ height: 5 }} />
                <span className="sig-bar" style={{ height: 8 }} />
                <span className="sig-bar" style={{ height: 11 }} />
                <span className="sig-bar" style={{ height: 14 }} />
              </span>
              <span className="screen-time">{time}</span>
            </div>

            <div className="screen-body">
              {screenContent}
            </div>

            {phase === "session" && (
              <div className="screen-input-row">
                <span className="screen-prompt">›</span>
                <input
                  ref={inputRef}
                  className="screen-input"
                  value={inputBuf}
                  onChange={(e) => setInputBuf(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && pressAction()}
                  placeholder="type reply…"
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                />
              </div>
            )}
          </div>

          {keypad}
          <div className="phone-home" />
        </div>
      </div>
    </section>
  );
}
