import { useEffect, useRef } from "react";
import { skinIn } from "../anim";

const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/>
    <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconHash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
);

const FLOW_STEPS = [
  { label: "Dial the shortcode",          sub: "e.g. *384*123# — works on any phone" },
  { label: "Main menu appears",           sub: "4 options, no internet needed" },
  { label: "Type your entry",             sub: "Kinyarwanda, English, or a mix" },
  { label: "AI parses it instantly",      sub: "Claude reads cost, revenue, profit" },
  { label: "See profit + coaching tip",   sub: "Right there on the USSD screen" },
];

const MENU_ITEMS = [
  "1. Injiza ibyagurishijwe / ibyaguze",
  "2. Reba inyungu y'uyu munsi",
  "3. Inama y'icyumweru",
  "4. Sohoka",
];

export default function UssdInfoPanel() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) skinIn(ref.current); }, []);

  return (
    <div className="ussd-panel" ref={ref} style={{ opacity: 0 }}>

      <div className="ussd-hero">
        <div className="ussd-hero-icon"><IconPhone /></div>
        <div>
          <div className="ussd-hero-title">USSD Channel</div>
          <div className="ussd-hero-sub">Works on any phone — no internet, no app, no data required</div>
        </div>
      </div>

      <div className="ussd-grid">

        {/* How it works */}
        <div className="ussd-card">
          <div className="ussd-card-label"><IconArrow /> How it works</div>
          <ol className="ussd-flow">
            {FLOW_STEPS.map((s, i) => (
              <li key={i} className="ussd-flow-step">
                <div className="step-num">{i + 1}</div>
                <div>
                  <div className="step-label">{s.label}</div>
                  <div className="step-sub">{s.sub}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Screen previews */}
        <div className="ussd-card">
          <div className="ussd-card-label"><IconHash /> On the device</div>

          <div className="ussd-screen" style={{ marginBottom: 14 }}>
            <div className="ussd-screen-header">INJIZA · *384*123#</div>
            <div className="ussd-screen-body">
              <div className="ussd-screen-line dim">Murakaza neza kuri INJIZA</div>
              {MENU_ITEMS.map((m) => (
                <div key={m} className="ussd-screen-line">{m}</div>
              ))}
            </div>
          </div>

          <div className="ussd-screen">
            <div className="ussd-screen-header">After typing an entry</div>
            <div className="ussd-screen-body">
              <div className="ussd-screen-line dim">Andika ibyo waguze n'ibyo wagurishije:</div>
              <div className="ussd-screen-line accent">naguze ibirayi 5000, nagurishije 7000</div>
              <div className="ussd-screen-divider"/>
              <div className="ussd-screen-line dim">Byafashwe!</div>
              <div className="ussd-screen-line gold">Inyungu: +2,000 RWF</div>
              <div className="ussd-screen-line small dim">Great margin — buy a larger batch tomorrow!</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
