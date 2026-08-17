import { useEffect, useRef, useState } from "react";
import { useMarket } from "@/lib/market-context";
import { useLayout } from "@/lib/layout";
import { pad2 } from "@/lib/market";
import type { TileDef } from "./Grid";

export function Topbar({ defs }: { defs: TileDef[] }) {
  const { snapshot, liveState, liveNote, tryLive } = useMarket();
  const layout = useLayout();
  const [utc, setUtc] = useState("--:--:-- UTC");
  const [popOpen, setPopOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setUtc(`${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setPopOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const hiddenDefs = defs.filter((d) => layout.hidden.includes(d.id));
  const seedDate = snapshot ? snapshot.fetchedAt.slice(0, 10) : "—";

  return (
    <header className="topbar">
      <div className="brand">
        <div className="wordmark">
          MERIDIAN<span className="wm-dot">.</span>
        </div>
        <div className="kicker">GLOBAL MARKET TERMINAL · V2.0 · FULL-STACK · AGENT OS</div>
      </div>
      <div className="top-ctrls">
        <span className="mock-badge" title="Intra-seed motion is a deterministic synthetic drift layer">
          ● MOCK TICKS
        </span>
        {liveState === "ok" ? (
          <span className="live-badge">● LIVE PATCH · STOOQ</span>
        ) : (
          <span className="seed-badge" title={liveState === "failed" ? liveNote : "Real 1D bars, build-time seed"}>
            ● SEED {seedDate}
          </span>
        )}
        <button
          className="ghost-btn"
          type="button"
          onClick={tryLive}
          disabled={liveState === "trying"}
          title={liveState === "failed" ? `LAST ATTEMPT: ${liveNote}` : "Attempt server-side live refresh"}
        >
          {liveState === "trying" ? "TRYING…" : "GO LIVE"}
        </button>
        <div className="utc">{utc}</div>
        <div className="tiles-menu" ref={popRef}>
          <button
            id="tiles-btn"
            className="ghost-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPopOpen(!popOpen);
            }}
          >
            TILES
          </button>
          <div className={`pop${popOpen ? " open" : ""}`}>
            <div className="pop-head">{hiddenDefs.length ? "HIDDEN TILES" : "LAYOUT"}</div>
            {hiddenDefs.length === 0 && <div className="pop-empty">ALL TILES VISIBLE</div>}
            {hiddenDefs.map((d) => (
              <button key={d.id} className="pop-item" type="button" onClick={() => layout.show(d.id)}>
                + {d.title}
              </button>
            ))}
            <button
              className="pop-reset"
              type="button"
              onClick={() => {
                layout.reset();
                setPopOpen(false);
              }}
            >
              RESET LAYOUT
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
