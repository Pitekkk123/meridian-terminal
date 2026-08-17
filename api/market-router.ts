// Market data router.
// Data plane: real history seeded at build time (Yahoo Finance via agent-gw),
// plus a deterministic synthetic drift layer for intra-refresh motion.
// The drift layer is MOCK and is labeled as such end-to-end.
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { watchlistItems } from "@db/schema";
import type { MarketSnapshot, MarketStatus } from "../contracts/market";

const SEED_PATH = path.resolve(process.cwd(), "api/data/seed-market.json");

let seedCache: MarketSnapshot | null = null;
let livePatch: Record<string, number> | null = null; // key -> live last price
let liveAt = 0;

function loadSeed(): MarketSnapshot {
  if (!seedCache) {
    const raw = readFileSync(SEED_PATH, "utf8");
    seedCache = JSON.parse(raw) as MarketSnapshot;
  }
  return seedCache;
}

/* deterministic hash noise — smooth pseudo-random walk, pure function of time */
function hashNoise(n: number, salt: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 2654435761) ^ Math.imul(salt, 2246822519);
  x = Math.imul(x ^ (x >>> 15), 3266489917);
  x ^= x >>> 13;
  return ((x >>> 0) % 20000) / 10000 - 1; // [-1, 1)
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

const TICK_MS = 2500;
/** bounded synthetic offset fraction for a symbol at a moment in time */
function mockDrift(key: string, now: number): number {
  const t = now / TICK_MS;
  const s = saltFor(key);
  return smoothNoise(t / 14, s) * 0.0035 + smoothNoise(t / 3.7, s + 11) * 0.0009;
}

function withDrift(snap: MarketSnapshot): MarketSnapshot {
  const now = Date.now();
  const out: MarketSnapshot = { ...snap, symbols: {} };
  for (const [key, sym] of Object.entries(snap.symbols)) {
    const drift = mockDrift(key, now);
    const candles = sym.candles.map((c) => ({ ...c }));
    const last = candles[candles.length - 1];
    const live = livePatch && livePatch[key];
    const base = live ?? last.c;
    const px = base * (1 + drift);
    candles[candles.length - 1] = {
      ...last,
      c: px,
      h: Math.max(last.h, px),
      l: Math.min(last.l, px),
    };
    out.symbols[key] = { ...sym, candles };
  }
  return out;
}

/** Best-effort live refresh (stooq CSV). Never throws; reports honestly. */
async function tryLiveRefresh(): Promise<{ ok: boolean; note: string }> {
  const snap = loadSeed();
  const tickers = Object.values(snap.symbols).map((s) => s.ticker);
  // stooq symbol mapping for a subset we can translate reliably
  const map: Record<string, string> = {};
  const rev: Record<string, string> = {};
  for (const s of Object.values(snap.symbols)) {
    let st: string | null = null;
    if (s.group === "chart" || s.group.startsWith("eq_")) st = s.ticker.toLowerCase().replace("brk-b", "brk-b") + ".us";
    if (s.key === "xau") st = "xauusd";
    if (s.key === "xag") st = "xagusd";
    if (s.key === "xpt") st = "xptusd";
    if (s.key === "xpd") st = "xpdusd";
    if (s.key === "spx") st = "^spx";
    if (s.key === "ixic") st = "^ndq";
    if (s.key === "dji") st = "^dji";
    if (st) {
      map[s.key] = st;
      rev[st] = s.key;
    }
  }
  const url =
    "https://stooq.com/q/l/?s=" +
    Object.values(map).join(",") +
    "&f=sd2t2ohlcv&h&e=csv";
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) throw new Error("http " + res.status);
    const csv = await res.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) throw new Error("empty");
    const patch: Record<string, number> = {};
    for (const ln of lines.slice(1)) {
      const p = ln.split(",");
      const key = rev[p[0]];
      const close = Number(p[6]);
      if (key && Number.isFinite(close)) patch[key] = close;
    }
    if (Object.keys(patch).length === 0) throw new Error("no rows");
    livePatch = { ...(livePatch ?? {}), ...patch };
    liveAt = Date.now();
    void tickers;
    return { ok: true, note: `stooq patched ${Object.keys(patch).length} symbols` };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : "fetch failed" };
  }
}

export const marketRouter = createRouter({
  snapshot: publicQuery.query(() => {
    const snap = withDrift(loadSeed());
    return {
      ...snap,
      quality: (livePatch ? "live" : "seed") as MarketSnapshot["quality"],
      liveAt: liveAt || null,
    };
  }),

  status: publicQuery.query((): MarketStatus & { liveAt: number | null } => {
    const snap = loadSeed();
    return {
      seedFetchedAt: snap.fetchedAt,
      source: snap.source,
      symbolCount: Object.keys(snap.symbols).length,
      ticksAreMock: true,
      liveAt: liveAt || null,
    };
  }),

  refreshLive: publicQuery.query(async () => {
    const r = await tryLiveRefresh();
    return { ...r, liveAt: liveAt || null };
  }),

  watchlist: createRouter({
    list: publicQuery.query(async () => {
      return getDb().select().from(watchlistItems).orderBy(watchlistItems.id);
    }),
    add: publicQuery
      .input(z.object({ symbolKey: z.string().min(1).max(32) }))
      .mutation(async ({ input }) => {
        await getDb()
          .insert(watchlistItems)
          .values({ symbolKey: input.symbolKey })
          .onDuplicateKeyUpdate({ set: { symbolKey: input.symbolKey } });
        return { ok: true };
      }),
    remove: publicQuery
      .input(z.object({ symbolKey: z.string().min(1).max(32) }))
      .mutation(async ({ input }) => {
        await getDb()
          .delete(watchlistItems)
          .where(eq(watchlistItems.symbolKey, input.symbolKey));
        return { ok: true };
      }),
  }),
});
