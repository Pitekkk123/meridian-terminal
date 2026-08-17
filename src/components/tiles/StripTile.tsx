// Generic quote-strip tile for fx / commodities / crypto groups.
import { useEffect, useRef } from "react";
import { useMarket } from "@/lib/market-context";
import { sparkline } from "@/lib/canvas";
import { fmt, fmtChg, quoteOf } from "@/lib/market";
import type { SymbolGroup } from "@contracts/market";

function QCard({ skey }: { skey: string }) {
  const { snapshot, now } = useMarket();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const sym = snapshot?.symbols[skey];

  useEffect(() => {
    if (cvRef.current && sym) sparkline(cvRef.current, quoteOf(sym.candles, skey, now).spark);
  }, [sym, now, skey]);

  if (!sym) return null;
  const q = quoteOf(sym.candles, skey, now);
  return (
    <div className="q-card" title={`${sym.name} · ${sym.ticker} · ${sym.unit || sym.ccy}`}>
      <div className="q-top">
        <span className="q-name">{sym.name}</span>
        <span className={`q-chg ${q.chgPct >= 0 ? "up" : "down"}`}>{fmtChg(q.chgPct)}</span>
      </div>
      <div className="q-px">{fmt(q.last, sym.dec)}</div>
      <canvas ref={cvRef} className="q-spark" />
    </div>
  );
}

export function StripTile({ group }: { group: SymbolGroup }) {
  const { snapshot } = useMarket();
  if (!snapshot) return <div className="tile-loading">LOADING…</div>;
  const keys = Object.values(snapshot.symbols)
    .filter((s) => s.group === group)
    .map((s) => s.key);
  return (
    <div className="q-row">
      {keys.map((k) => (
        <QCard key={k} skey={k} />
      ))}
    </div>
  );
}
