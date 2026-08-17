// Formatting + deterministic client-side drift (MOCK motion layer on real closes).

const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf4 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const nf3 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function fmt(v: number | null | undefined, dec = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (dec === 0) return nf0.format(v);
  if (dec === 4) return nf4.format(v);
  if (dec === 3) return nf3.format(v);
  return nf2.format(v);
}

export function fmtChg(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

export function fmtCompact(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(Math.round(v));
}

export const pad2 = (n: number) => (n < 10 ? "0" : "") + n;

/* ---- deterministic smooth noise (same family as server drift) ---- */
function hashNoise(n: number, salt: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 2654435761) ^ Math.imul(salt, 2246822519);
  x = Math.imul(x ^ (x >>> 15), 3266489917);
  x ^= x >>> 13;
  return ((x >>> 0) % 20000) / 10000 - 1;
}
function smoothNoise(t: number, salt: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return hashNoise(i, salt) * (1 - u) + hashNoise(i + 1, salt) * u;
}
function saltFor(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return Math.abs(h % 99991) + 1;
}

export const TICK_MS = 2500;
export function mockDrift(key: string, now: number): number {
  const t = now / TICK_MS;
  const s = saltFor(key);
  return smoothNoise(t / 14, s) * 0.0035 + smoothNoise(t / 3.7, s + 11) * 0.0009;
}

/* derived quote helpers */
export type Quote = {
  last: number;
  prevClose: number;
  chgPct: number;
  chgAbs: number;
  dayLow: number;
  dayHigh: number;
  spark: number[];
};

export function quoteOf(
  candles: { c: number; h: number; l: number; o: number }[],
  key: string,
  now: number
): Quote {
  const drift = mockDrift(key, now);
  const n = candles.length;
  const prevClose = n > 1 ? candles[n - 2].c : candles[n - 1].o;
  const base = candles[n - 1].c;
  const last = base * (1 + drift);
  const dayLowBase = Math.min(candles[n - 1].l, base);
  const dayHighBase = Math.max(candles[n - 1].h, base);
  const spark = candles.map((c, i) =>
    i === n - 1 ? last : c.c
  );
  return {
    last,
    prevClose,
    chgPct: ((last - prevClose) / prevClose) * 100,
    chgAbs: last - prevClose,
    dayLow: Math.min(dayLowBase, last),
    dayHigh: Math.max(dayHighBase, last),
    spark,
  };
}
