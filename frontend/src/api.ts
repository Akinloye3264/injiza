// ── Injiza AI Engine — all Claude calls go through here ─────────────────────
// Calls are proxied through the backend (/api/*) so the Anthropic key
// never touches the browser. See backend/src/claude.js for the server side.

import type { BookkeepingRecord } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "";

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error((err as { error: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

/** Parse a raw bookkeeping entry via Claude (server-side). */
export async function callClaude(entry: string): Promise<Omit<BookkeepingRecord, "entry" | "ts">> {
  return post("/api/parse", { entry });
}

/** Get a weekly coaching insight from the week's records. */
export async function getWeeklyInsight(records: BookkeepingRecord[]): Promise<string> {
  const summary = records
    .map((r) => `"${r.entry}" → profit ${r.profit} RWF`)
    .join("; ");
  const data = await post<{ insight: string }>("/api/weekly-insight", { summary });
  return data.insight;
}

/** Seed example entries for the demo */
export const EXAMPLES = [
  "naguze ibirayi 5000, nagurishije 7000",
  "bought tomatoes 8000, sold for 6500",
  "nguze sukari 12000 nagurishije 15000, naguze umuceri 10000",
  "cut hair 5 people, 1000 each, paid 800 for clippers",
] as const;

/** Mock loan-readiness score (illustrative only — not a real credit score) */
export function loanScore(entries: number, totalProfit: number): number {
  return Math.min(100, entries * 12 + (totalProfit > 0 ? 25 : 0));
}
