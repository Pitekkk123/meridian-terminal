// Market data context: one tRPC snapshot + 2.5s tick clock for the MOCK drift layer.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { trpc } from "@/providers/trpc";
import { TICK_MS } from "./market";
import type { MarketSnapshot } from "@contracts/market";

type SnapshotWithMeta = MarketSnapshot & { liveAt: number | null };

type MarketCtx = {
  snapshot: SnapshotWithMeta | null;
  now: number;
  loading: boolean;
  error: boolean;
  liveState: "idle" | "trying" | "ok" | "failed";
  liveNote: string;
  tryLive: () => void;
};

const Ctx = createContext<MarketCtx>({
  snapshot: null,
  now: Date.now(),
  loading: true,
  error: false,
  liveState: "idle",
  liveNote: "",
  tryLive: () => undefined,
});

export function MarketProvider({ children }: { children: ReactNode }) {
  const q = trpc.market.snapshot.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: 1,
    staleTime: 30_000,
  });
  const refresh = trpc.market.refreshLive.useQuery(undefined, {
    enabled: false,
    retry: 0,
  });
  const utils = trpc.useUtils();
  const [now, setNow] = useState(() => Date.now());
  const [liveState, setLiveState] = useState<MarketCtx["liveState"]>("idle");
  const [liveNote, setLiveNote] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const tryLive = () => {
    setLiveState("trying");
    setLiveNote("");
    refresh.refetch().then((r) => {
      const d = r.data;
      if (d?.ok) {
        setLiveState("ok");
        setLiveNote(d.note);
        void utils.market.snapshot.invalidate();
      } else {
        setLiveState("failed");
        setLiveNote(d?.note ?? "unreachable");
      }
    }).catch(() => {
      setLiveState("failed");
      setLiveNote("request failed");
    });
  };

  const value = useMemo<MarketCtx>(
    () => ({
      snapshot: (q.data as SnapshotWithMeta | undefined) ?? null,
      now,
      loading: q.isLoading,
      error: q.isError,
      liveState,
      liveNote,
      tryLive,
    }),
    [q.data, q.isLoading, q.isError, now, liveState, liveNote]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarket() {
  return useContext(Ctx);
}
