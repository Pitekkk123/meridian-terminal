import { useMarket } from "@/lib/market-context";
import { fmtChg, quoteOf } from "@/lib/market";

export function MoversTile() {
  const { snapshot, now } = useMarket();
  if (!snapshot) return <div className="tile-loading">LOADING MOVERS…</div>;

  const quoted = Object.values(snapshot.symbols)
    .filter((s) => s.group.startsWith("eq_"))
    .map((m) => ({ m, q: quoteOf(m.candles, m.key, now) }))
    .sort((a, b) => b.q.chgPct - a.q.chgPct);

  const gainers = quoted.slice(0, 5);
  const losers = quoted.slice(-5).reverse();

  const RowEl = ({ item }: { item: (typeof quoted)[number] }) => (
    <div className="mv-row">
      <span>
        <span className="mv-sym">{item.m.key}</span>
        <span className="mv-name">{item.m.name.toUpperCase()}</span>
      </span>
      <span className={`mv-chg ${item.q.chgPct >= 0 ? "up" : "down"}`}>
        {fmtChg(item.q.chgPct)}
      </span>
    </div>
  );

  return (
    <div className="mv-cols">
      <div>
        <div className="mv-col-head">TOP GAINERS · 1D</div>
        {gainers.map((x) => (
          <RowEl key={x.m.key} item={x} />
        ))}
      </div>
      <div>
        <div className="mv-col-head">TOP LOSERS · 1D</div>
        {losers.map((x) => (
          <RowEl key={x.m.key} item={x} />
        ))}
      </div>
    </div>
  );
}
