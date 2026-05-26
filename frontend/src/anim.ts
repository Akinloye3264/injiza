// ── Injiza animation helpers — all anime.js calls live here ─────────────────
import anime from "animejs";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = (ms: number) => (reduced ? 0 : ms);

// Organic blob morph — loops forever, gives the hero life
export function morphBlob(el: Element, delay = 0) {
  return anime({
    targets: el,
    borderRadius: [
      "50% 62% 55% 48% / 60% 50% 68% 55%",
      "62% 48% 68% 54% / 50% 68% 46% 62%",
      "48% 58% 52% 64% / 64% 44% 58% 50%",
      "58% 50% 46% 56% / 48% 60% 52% 46%",
      "50% 62% 55% 48% / 60% 50% 68% 55%",
    ],
    translateY: [0, -18, 8, -12, 0],
    translateX: [0, 12, -8, 14, 0],
    scale: [1, 1.04, 0.97, 1.02, 1],
    duration: dur(14000),
    loop: true,
    easing: "easeInOutSine",
    delay,
  });
}

// Hero entrance: eyebrow + wordmark slide up from below
export function animateHeroEntrance(eyebrowEl: Element, wordmarkEl: Element) {
  return anime.timeline({ easing: "easeOutExpo" })
    .add({
      targets: eyebrowEl,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: dur(600),
    })
    .add({
      targets: wordmarkEl,
      opacity: [0, 1],
      translateY: [40, 0],
      scale: [0.92, 1],
      duration: dur(750),
    }, "-=300");
}

// Tab panel transition — slide in from right
export function animateTabIn(el: Element) {
  return anime({
    targets: el,
    opacity: [0, 1],
    translateX: [24, 0],
    duration: dur(380),
    easing: "easeOutExpo",
  });
}

// Page-load stagger reveal
export function revealPageElements(targets: string) {
  return anime({
    targets,
    opacity: [0, 1],
    translateY: [24, 0],
    duration: dur(600),
    delay: anime.stagger(80),
    easing: "easeOutExpo",
  });
}

// SMS bubble spring-in
export function animateBubble(el: Element, fromRight: boolean) {
  return anime({
    targets: el,
    opacity: [0, 1],
    translateY: [20, 0],
    translateX: [fromRight ? 20 : -20, 0],
    scale: [0.92, 1],
    duration: dur(420),
    easing: "easeOutExpo",
  });
}

// Typing indicator dots loop
export function startTypingDots(dots: NodeListOf<Element>) {
  return anime({
    targets: dots,
    opacity: [0.2, 1],
    translateY: [3, 0],
    loop: true,
    direction: "alternate",
    duration: dur(400),
    delay: anime.stagger(120),
    easing: "easeInOutSine",
  });
}

// Count-up a number (animates obj.val, calls onUpdate each frame)
export function countUp(
  to: number,
  onUpdate: (v: number) => void,
  durationMs = 800
) {
  const obj = { val: 0 };
  return anime({
    targets: obj,
    val: to,
    duration: dur(durationMs),
    easing: "easeOutExpo",
    update: () => onUpdate(Math.round(obj.val)),
  });
}

// Loan-readiness arc fill (SVG stroke-dashoffset)
export function animateArc(el: SVGElement, score: number, circumference: number) {
  const offset = circumference - (score / 100) * circumference;
  return anime({
    targets: el,
    strokeDashoffset: [circumference, offset],
    duration: dur(1200),
    easing: "easeOutQuint",
  });
}

// Skin toggle: slide indicator
export function slideIndicator(el: Element, toX: number) {
  return anime({
    targets: el,
    translateX: toX,
    duration: dur(300),
    easing: "easeOutExpo",
  });
}

// Skin transition: fade + slide
export function skinOut(el: Element) {
  return anime({
    targets: el,
    opacity: [1, 0],
    translateY: [0, -16],
    duration: dur(220),
    easing: "easeInQuad",
  });
}

export function skinIn(el: Element) {
  return anime({
    targets: el,
    opacity: [0, 1],
    translateY: [16, 0],
    duration: dur(340),
    easing: "easeOutExpo",
  });
}

// Entry card stagger-in
export function staggerCards(targets: string) {
  return anime({
    targets,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: dur(400),
    delay: anime.stagger(60),
    easing: "easeOutExpo",
  });
}

// Profit bar chart bars animate in
export function animateBars(targets: string) {
  return anime({
    targets,
    scaleY: [0, 1],
    duration: dur(600),
    delay: anime.stagger(80),
    easing: "easeOutExpo",
  });
}
