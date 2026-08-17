import { useEffect, useRef } from "react";
import { useMarket } from "@/lib/market-context";
import { sparkline } from "@/lib/canvas";
import { fmt, fmtChg, quoteOf } from "@/lib/market";

function Row({ skey }: { skey: string }) {
  const { snapshot, now } = useMarket();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const sym = snapshot?.symbols[skey];

  useEffect(() => {
    if (cvRef.current && sym) {
      sparkline(cvRef.current, quoteOf(sym.candles, skey, now).spark);
    }
  }, [sym, now, skey]);

  if (!sym) return null;
  const q = quoteOf(sym.candles, skey, now);
  return (
    <div className="ix-row">
      <span className="c0 ix-name">
        {sym.name}
        <span className="ix-region">{sym.ccy}</span>
      </span>
      <span className="c1 ix-last">{fmt(q.last, sym.dec)}</span>
      <span className={`c2 ix-chg ${q.chgPct >= 0 ? "up" : "down"}`}>{fmtChg(q.chgPct)}</span>
      <span className="c3 ix-sparkwrap">
        <canvas ref={cvRef} className="ix-spark" />
      </span>
    </div>
  );
}

export function IndicesTile() {
  const { snapshot } = useMarket();
  if (!snapshot) return <div className="tile-loading">LOADING INDICES…</div>;
  const keys = Object.values(snapshot.symbols)
    .filter((s) => s.group === "indices")
    .map((s) => s.key);

  return (
    <>
      <div className="ix-row ix-head">
        <span className="c0">NAME</span>
        <span className="c1">LAST</span>
        <span className="c2">CHG</span>
        <span className="c3">1M DAILY</span>
      </div>
      <div className="ix-list">
        {keys.map((k) => (
          <Row key={k} skey={k} />
        ))}
      </div>
    </>
  );
}
