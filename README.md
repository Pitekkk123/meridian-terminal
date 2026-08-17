# MERIDIAN — Global Market Terminal

Black-background, terminal-style, drag-and-drop canvas dashboard for global market
monitoring. Full-stack: React 19 + Vite frontend, Hono + tRPC 11 backend,
Drizzle ORM + MySQL persistence.

## Modules

| Tile | Contents |
|---|---|
| AAPL · 60 SESSIONS | Real daily candles, MA 20, volume, crosshair OHLC, last-price tag |
| WORLD SESSION CLOCKS | NY / London / Frankfurt / Tokyo / Hong Kong / Sydney — OPEN/CLOSED, countdowns, 24 h bars |
| GLOBAL INDICES | S&P 500, NASDAQ, Dow, Euro Stoxx 50, FTSE, DAX, Nikkei, Hang Seng + sparklines |
| SECTOR HEATMAP | AI & semis, energy, financials — 24 real tickers, weight-sized cells |
| PRECIOUS METALS | Gold, silver, platinum, palladium futures + day range |
| FX MAJORS / COMMODITIES / CRYPTO | EUR/USD, USD/JPY, GBP/USD, USD/PLN, EUR/PLN · WTI, Brent, NatGas, Copper · BTC, ETH, SOL |
| MOVERS | Top gainers / losers across the equity universe |
| WATCHLIST | MySQL-persisted via tRPC, shared across visits |

## Data plane (honest labels)

- **SEED** — real 1-day bars pulled from Yahoo Finance at build time, stored as
  a gzip+base64 fixture (`api/data/seed-market.json.b64`, decoded by
  `api/market-router.ts` at boot; 49 symbols, timestamped).
- **MOCK TICKS** (red badge) — a deterministic synthetic drift layer animating
  the last price between refreshes. Always on, always labeled.
- **GO LIVE** — attempts a server-side stooq.com quote patch; on success the
  badge flips to `LIVE PATCH · STOOQ`, on failure the app reports the reason and
  keeps serving the seed. No silent fallbacks, no fake "live".

## Layout

Drag tiles by their header grip; `×` hides; TILES menu restores or resets.
Order + hidden set persist in `localStorage` (`meridian.layout.v2`) — browser-local
by design; the watchlist is the server-persisted state.

## Run

```bash
npm install
python3 scripts/fetch-fonts.py   # downloads local woff2 into public/fonts
cp .env.example .env             # or use platform-generated .env
npm run db:push && npx tsx db/seed.ts
npm run dev                      # http://localhost:3000
npm run build && npm start       # production
```

## Structure

```
api/            Hono boot, tRPC routers (market-router.ts), data/seed-market.json.b64
contracts/      shared types (market.ts)
db/             Drizzle schema (watchlist_items), seed.ts
src/
  components/   Topbar, StatusBar, Grid (DnD), tiles/*
  lib/          canvas.ts (DPR charts), market.ts (fmt+drift),
                market-context.tsx (tRPC polling), layout.tsx (persistence)
  finn.css      finn-app design system (tokens, components, grain)
public/fonts/   local woff2 (Newsreader / IBM Plex Mono / Instrument Sans)
```

Design system: see the `finn-app` skill (tokens, patterns, zero-console-error
discipline). UI language: English. Not for trading.
