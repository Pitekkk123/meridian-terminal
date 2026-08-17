// Shared market-data contracts (frontend ↔ backend).

export type Candle = {
  d: string; // ISO date
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type SymbolGroup =
  | "indices"
  | "metals"
  | "fx"
  | "commodities"
  | "crypto"
  | "eq_ai"
  | "eq_energy"
  | "eq_fin"
  | "chart";

export type SymbolData = {
  key: string;
  ticker: string;
  name: string;
  unit: string;
  ccy: string;
  group: SymbolGroup;
  dec: number;
  weight: number;
  candles: Candle[];
};

export type DataQuality = "live" | "seed";

export type MarketSnapshot = {
  fetchedAt: string; // ISO — when the seed was pulled from the source
  source: string; // e.g. "YAHOO FINANCE"
  quality: DataQuality;
  symbols: Record<string, SymbolData>;
};

export type MarketStatus = {
  seedFetchedAt: string;
  source: string;
  symbolCount: number;
  /** Synthetic intra-seed drift layer is always on between refreshes. */
  ticksAreMock: true;
};

export const GROUP_LABEL: Record<SymbolGroup, string> = {
  indices: "GLOBAL INDICES",
  metals: "PRECIOUS METALS",
  fx: "FX MAJORS",
  commodities: "COMMODITIES",
  crypto: "CRYPTO",
  eq_ai: "AI & SEMICONDUCTORS",
  eq_energy: "ENERGY",
  eq_fin: "FINANCIALS",
  chart: "CHART",
};
