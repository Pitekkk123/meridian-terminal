// Layout state: tile order + hidden set, persisted to localStorage.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const KEY = "meridian.layout.v2";

export type LayoutState = {
  order: string[];
  hidden: string[];
  setOrder: (o: string[]) => void;
  hide: (id: string) => void;
  show: (id: string) => void;
  reset: () => void;
};

const Ctx = createContext<LayoutState | null>(null);

function load(allIds: string[]): { order: string[]; hidden: string[] } {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { order?: string[]; hidden?: string[] };
      const known = new Set(allIds);
      const order = (parsed.order ?? []).filter((id) => known.has(id));
      for (const id of allIds) if (!order.includes(id)) order.push(id);
      const hidden = (parsed.hidden ?? []).filter((id) => known.has(id));
      return { order, hidden };
    }
  } catch {
    /* storage unavailable */
  }
  return { order: [...allIds], hidden: [] };
}

function persist(order: string[], hidden: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ order, hidden }));
  } catch {
    /* noop */
  }
}

export function LayoutProvider({ allIds, children }: { allIds: string[]; children: ReactNode }) {
  const [state, setState] = useState(() => load(allIds));

  const api = useMemo<LayoutState>(
    () => ({
      order: state.order,
      hidden: state.hidden,
      setOrder: (o) => {
        setState({ order: o, hidden: state.hidden });
        persist(o, state.hidden);
      },
      hide: (id) => {
        const hidden = [...state.hidden, id];
        setState({ order: state.order, hidden });
        persist(state.order, hidden);
      },
      show: (id) => {
        const hidden = state.hidden.filter((x) => x !== id);
        setState({ order: state.order, hidden });
        persist(state.order, hidden);
      },
      reset: () => {
        try {
          window.localStorage.removeItem(KEY);
        } catch {
          /* noop */
        }
        setState({ order: [...allIds], hidden: [] });
      },
    }),
    [state, allIds]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useLayout(): LayoutState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLayout outside provider");
  return v;
}
