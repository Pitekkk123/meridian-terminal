import { useMarket } from "@/lib/market-context";
import { pad2 } from "@/lib/market";

export function StatusBar() {
  const { snapshot, now, liveState } = useMarket();
  const d = new Date(now);
  const src = snapshot ? snapshot.source : "—";
  const seedTs = snapshot ? snapshot.fetchedAt.replace("T", " ").slice(0, 16) + "Z" : "—";

  return (
    <footer className="statusbar">
      <div className="prov">
        <span className={`dot ${liveState === "ok" ? "open" : "watch"}`}></span>
        <span>SOURCE: {src}</span>
        <span className="prov-sep">|</span>
        <span>SEED: {seedTs}</span>
        <span className="prov-sep">|</span>
        <span style={{ color: "#D89A8C" }}>TICKS: MOCK · SYNTHETIC DRIFT</span>
        <span className="prov-sep">|</span>
        <span>NOT FOR TRADING</span>
        <span className="prov-sep">|</span>
        <span>WATCHLIST: MYSQL</span>
        <span className="prov-sep">|</span>
        <span>LAYOUT: LOCALSTORAGE</span>
      </div>
      <div className="upd">
        UPDATED {pad2(d.getHours())}:{pad2(d.getMinutes())}:{pad2(d.getSeconds())} LOCAL
      </div>
    </footer>
  );
}
