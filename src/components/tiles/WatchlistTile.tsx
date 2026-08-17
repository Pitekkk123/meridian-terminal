import { useEffect, useRef, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useMarket } from "@/lib/market-context";
import { sparkline } from "@/lib/canvas";
import { fmt, fmtChg, quoteOf } from "@/lib/market";

function WlRow({ skey, onRemove }: { skey: string; onRemove: (k: string) => void }) {
  const { snapshot, now } = useMarket();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const sym = snapshot?.symbols[skey];

  useEffect(() => {
    if (cvRef.current && sym) sparkline(cvRef.current, quoteOf(sym.candles, skey, now).spark);
  }, [sym, now, skey]);

  if (!sym) return null;
  const q = quoteOf(sym.candles, skey, now);
  return (
    <div className="wl-row">
      <span className="wl-sym">
        {sym.key.toUpperCase()}
        <span className="wl-sub">{sym.name.toUpperCase()}</span>
      </span>
      <span className="wl-px">{fmt(q.last, sym.dec)}</span>
      <span className={`wl-chg ${q.chgPct >= 0 ? "up" : "down"}`}>{fmtChg(q.chgPct)}</span>
      <canvas ref={cvRef} className="wl-spark" />
      <button
        className="icon-btn"
        type="button"
        aria-label={`Remove ${sym.key}`}
        onClick={() => onRemove(skey)}
      >
        ×
      </button>
    </div>
  );
}

export function WatchlistTile() {
  const { snapshot } = useMarket();
  const utils = trpc.useUtils();
  const list = trpc.market.watchlist.list.useQuery(undefined, { retry: 1 });
  const add = trpc.market.watchlist.add.useMutation({
    onSuccess: () => void utils.market.watchlist.list.invalidate(),
  });
  const remove = trpc.market.watchlist.remove.useMutation({
    onSuccess: () => void utils.market.watchlist.list.invalidate(),
  });
  const [pick, setPick] = useState("");

  if (!snapshot) return <div className="tile-loading">LOADING WATCHLIST…</div>;

  const items = list.data ?? [];
  const watched = new Set(items.map((i) => i.symbolKey));
  const candidates = Object.values(snapshot.symbols).filter((s) => !watched.has(s.key));
  const dbDown = list.isError;

  return (
    <>
      <div className="wl-add">
        <select
          className="wl-select"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          disabled={dbDown}
        >
          <option value="">ADD SYMBOL…</option>
          {candidates.map((s) => (
            <option key={s.key} value={s.key}>
              {s.key.toUpperCase()} · {s.name}
            </option>
          ))}
        </select>
        <button
          className="ghost-btn"
          type="button"
          disabled={!pick || add.isPending || dbDown}
          onClick={() => {
            if (!pick) return;
            add.mutate({ symbolKey: pick });
            setPick("");
          }}
        >
          ADD
        </button>
      </div>
      {dbDown ? (
        <div className="wl-empty">DATABASE UNAVAILABLE — WATCHLIST DISABLED</div>
      ) : items.length === 0 ? (
        <div className="wl-empty">WATCHLIST EMPTY — ADD A SYMBOL ABOVE</div>
      ) : (
        items.map((i) => (
          <WlRow key={i.symbolKey} skey={i.symbolKey} onRemove={(k) => remove.mutate({ symbolKey: k })} />
        ))
      )}
      <div className="wl-note">PERSISTED IN MYSQL VIA TRPC · SHARED ACROSS VISITS</div>
    </>
  );
}
