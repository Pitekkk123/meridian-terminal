import { useEffect, useRef } from "react";
import { useMarket } from "@/lib/market-context";
import { sparkline } from "@/lib/canvas";
import { fmt, fmtChg, quoteOf } from "@/lib/market";

function MetalCard({ skey }: { skey: string }) {
  const { snapshot, now } = useMarket();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const sym = snapshot?.symbols[skey];

  useEffect(() => {
    if (cvRef.current && sym) sparkline(cvRef.current, quoteOf(sym.candles, skey, now).spark);
  }, [sym, now, skey]);

  if (!sym) return null;
  const q = quoteOf(sym.candles, skey, now);
  const span = q.dayHigh - q.dayLow;
  const pos = span > 0 ? Math.max(0, Math.min(1, (q.last - q.dayLow) / span)) : 0.5;

  return (
    <div className="mt-card">
      <div className="mt-head">
        <span className="mt-name">{sym.name}</span>
        <span className="mt-sym">
          {sym.ticker} · {sym.unit}
        </span>
      </div>
      <div className="mt-pxrow">
        <div className="mt-px">{fmt(q.last, sym.dec)}</div>
        <span className={`mt-pill ${q.chgPct >= 0 ? "up" : "down"}`}>{fmtChg(q.chgPct)}</span>
      </div>
      <canvas ref={cvRef} className="mt-spark" />
      <div className="mt-range">
        <div className="mt-range-marker" style={{ left: `${(pos * 100).toFixed(1)}%` }} />
      </div>
      <div className="mt-rangelbl">
        <span>L {fmt(q.dayLow, sym.dec)}</span>
        <span>H {fmt(q.dayHigh, sym.dec)}</span>
      </div>
    </div>
  );
}

export function MetalsTile() {
  const { snapshot } = useMarket();
  if (!snapshot) return <div className="tile-loading">LOADING METALS…</div>;
  const keys = Object.values(snapshot.symbols)
    .filter((s) => s.group === "metals")
    .map((s) => s.key);
  return (
    <div className="mt-row">
      {keys.map((k) => (
        <MetalCard key={k} skey={k} />
      ))}
    </div>
  );
}
