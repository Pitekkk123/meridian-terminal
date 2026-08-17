import { useState } from "react";
import { useMarket } from "@/lib/market-context";
import { fmt, fmtChg, quoteOf } from "@/lib/market";
import { GROUP_LABEL, type SymbolGroup } from "@contracts/market";

const GROUPS: SymbolGroup[] = ["eq_ai", "eq_energy", "eq_fin"];

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
  return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(
    pa[1] + (pb[1] - pa[1]) * t
  )},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`;
}

function heatColor(chg: number) {
  const t = Math.max(-1, Math.min(1, chg / 3));
  if (t >= 0)
    return {
      bg: mix("#10151C", "#3E5D4A", t * 0.85),
      fg: mix("#8FA596", "#86B593", 0.35 + t * 0.65),
      t,
    };
  return {
    bg: mix("#10151C", "#78242F", -t * 0.85),
    fg: mix("#B08D86", "#D89A8C", 0.35 + -t * 0.65),
    t,
  };
}

export function HeatmapTile() {
  const { snapshot, now } = useMarket();
  const [sort, setSort] = useState<"cap" | "move">("cap");

  if (!snapshot) return <div className="tile-loading">LOADING HEATMAP…</div>;

  return (
    <>
      <div className="hm-bar">
        <span className="hm-hint">CELL = 1D CHG · SIZE = WEIGHT</span>
        <button
          className="ghost-btn"
          type="button"
          onClick={() => setSort(sort === "cap" ? "move" : "cap")}
        >
          {sort === "cap" ? "SORT: BY WEIGHT" : "SORT: BY MOVE"}
        </button>
      </div>
      <div className="hm-wrap">
        {GROUPS.map((g) => {
          const members = Object.values(snapshot.symbols).filter((s) => s.group === g);
          if (!members.length) return null;
          const quoted = members.map((m) => ({ m, q: quoteOf(m.candles, m.key, now) }));
          const wsum = quoted.reduce((s, x) => s + x.m.weight, 0);
          const avg = quoted.reduce((s, x) => s + x.q.chgPct * x.m.weight, 0) / wsum;
          const cells = [...quoted].sort((a, b) =>
            sort === "cap"
              ? b.m.weight - a.m.weight
              : Math.abs(b.q.chgPct) - Math.abs(a.q.chgPct)
          );
          return (
            <div className="hm-sec" key={g}>
              <div className="hm-sec-head">
                <span className="hm-sec-name">{GROUP_LABEL[g]}</span>
                <span className={`hm-sec-avg ${avg >= 0 ? "up" : "down"}`}>
                  AVG {fmtChg(avg)}
                </span>
              </div>
              <div className="hm-grid">
                {cells.map(({ m, q }) => {
                  const hc = heatColor(q.chgPct);
                  return (
                    <div
                      key={m.key}
                      className="hm-cell"
                      style={{
                        flexGrow: m.weight,
                        background: hc.bg,
                        borderColor:
                          q.chgPct >= 0
                            ? `rgba(134,181,147,${0.12 + Math.abs(hc.t) * 0.3})`
                            : `rgba(188,115,98,${0.12 + Math.abs(hc.t) * 0.3})`,
                      }}
                      title={`${m.name} · ${m.ticker} · LAST ${fmt(q.last, m.dec)} ${m.ccy} · ${fmtChg(q.chgPct)}`}
                    >
                      <span className="hm-t">{m.key}</span>
                      <span className="hm-chg" style={{ color: hc.fg }}>
                        {fmtChg(q.chgPct)}
                      </span>
                      <span className="hm-px">{fmt(q.last, m.dec)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
