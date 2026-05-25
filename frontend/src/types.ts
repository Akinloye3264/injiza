// ── Injiza shared type definitions ──────────────────────────────────────────

export interface Item {
  name: string;
  cost: number;
  revenue: number;
}

export interface BookkeepingRecord {
  entry: string;
  items: Item[];
  total_cost: number;
  total_revenue: number;
  profit: number;
  insight: string;
  ts: number;
}

export type Skin = "app" | "ussd";
