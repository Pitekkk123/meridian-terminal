import { useEffect, useRef, useState } from "react";
import { useMarket } from "@/lib/market-context";
import { SessionChart } from "@/lib/canvas";
import { fmt, fmtChg, fmtCompact, mockDrift } from "@/lib/market";

export function ChartTile() {
  const { snapshot, now } = useMarket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<SessionChart | null>(null);
  const [type, setType] = useState<"candles" | "line">("candles");
  const [ma, setMa] = useState(true);
  const [readout, setReadout] = useState("HOVER FOR OHLC");

  const sym = snapshot?.symbols["aapl"] ?? null;

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new SessionChart(canvasRef.current);
    chart.onHover = (c) => {
      if (!c) {
        setReadout("HOVER FOR OHLC");
        return;
      }
      setReadout(
        `${c.d}  ·  O ${fmt(c.o, 2)}  H ${fmt(c.h, 2)}  L ${fmt(c.l, 2)}  C ${fmt(c.c, 2)}  VOL ${fmtCompact(c.v)}`
      );
    };
    chartRef.current = chart;
    return () => chart.destroy();
  }, []);

  useEffect(() => {
    if (chartRef.current && sym) chartRef.current.setData(sym.candles);
  }, [sym]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.type = type;
      chartRef.current.showMA = ma;
      chartRef.current.draw();
    }
  }, [type, ma]);

  useEffect(() => {
    if (chartRef.current && sym) {
      chartRef.current.liveLast =
        sym.candles[sym.candles.length - 1].c * (1 + mockDrift("aapl", now));
      chartRef.current.draw();
    }
  }, [now, sym]);

  const cs = sym?.candles ?? [];
  const lastBar = cs.length ? cs[cs.length - 1] : null;
  const prevClose = cs.length > 1 ? cs[cs.length - 2].c : null;
  const drift = mockDrift("aapl", now);
  const last = lastBar ? lastBar.c * (1 + drift) : null;
  const chgPct = last != null && prevClose ? ((last - prevClose) / prevClose) * 100 : null;
  const ma20 =
    cs.length >= 20 ? cs.slice(-20).reduce((s, c) => s + c.c, 0) / 20 : null;
  const cls = chgPct != null && chgPct < 0 ? "down" : "up";
  const seedDate = snapshot ? snapshot.fetchedAt.slice(0, 10) : "—";

  return (
    <>
      <div className="aapl-top">
        <div className="aapl-last">{last != null ? fmt(last, 2) : "—"}</div>
        <div className="aapl-chgbox">
          <span className={`aapl-chg ${cls}`}>{chgPct != null ? fmtChg(chgPct) : "—"}</span>
          <span className={`aapl-chgabs ${cls}`}>
            {last != null && prevClose != null
              ? (chgPct! >= 0 ? "+" : "−") + fmt(Math.abs(last - prevClose), 2) + " USD"
              : "—"}
          </span>
        </div>
        <div className="aapl-stats">
          <div className="aapl-stat">
            <span className="k">O</span>
            <span className="v">{lastBar ? fmt(lastBar.o, 2) : "—"}</span>
          </div>
          <div className="aapl-stat">
            <span className="k">H</span>
            <span className="v">{lastBar ? fmt(lastBar.h, 2) : "—"}</span>
          </div>
          <div className="aapl-stat">
            <span className="k">L</span>
            <span className="v">{lastBar ? fmt(lastBar.l, 2) : "—"}</span>
          </div>
          <div className="aapl-stat">
            <span className="k">VOL</span>
            <span className="v">{lastBar ? fmtCompact(lastBar.v) : "—"}</span>
          </div>
          <div className="aapl-stat">
            <span className="k">MA20</span>
            <span className="v">{ma20 ? fmt(ma20, 2) : "—"}</span>
          </div>
          <div className="aapl-stat">
            <span className="k">SEED</span>
            <span className="v">{seedDate}</span>
          </div>
        </div>
        <div className="aapl-ctrls">
          <div className="seg seg-sm">
            <button
              className={`seg-btn${type === "candles" ? " on" : ""}`}
              onClick={() => setType("candles")}
              type="button"
            >
              CANDLES
            </button>
            <button
              className={`seg-btn${type === "line" ? " on" : ""}`}
              onClick={() => setType("line")}
              type="button"
            >
              LINE
            </button>
            <button
              className={`seg-btn${ma ? " on" : ""}`}
              onClick={() => setMa(!ma)}
              type="button"
            >
              MA 20
            </button>
          </div>
          <div className="aapl-readout">{readout}</div>
        </div>
      </div>
      <div className="aapl-canvas-wrap">
        <canvas ref={canvasRef} className="aapl-canvas" />
      </div>
    </>
  );
}
