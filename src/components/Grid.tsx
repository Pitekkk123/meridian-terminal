// Draggable tile grid: 12-col canvas, live reorder, hide/restore.
import { useRef, useState, type ReactNode } from "react";
import { useLayout } from "@/lib/layout";

export type TileDef = {
  id: string;
  span: number;
  title: string;
  meta: string;
  render: () => ReactNode;
};

function Tile({
  def,
  index,
  dragId,
  setDragId,
  onReorder,
}: {
  def: TileDef;
  index: number;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onReorder: (targetId: string) => void;
}) {
  const layout = useLayout();
  const arm = useRef(false);

  return (
    <section
      className={`tile reveal${dragId === def.id ? " dragging" : ""}`}
      data-tile={def.id}
      style={{ gridColumn: `span ${def.span}`, animationDelay: `${index * 60}ms` }}
      draggable
      onDragStart={(e) => {
        if (!arm.current) {
          e.preventDefault();
          return;
        }
        setDragId(def.id);
        try {
          e.dataTransfer.setData("text/plain", def.id);
          e.dataTransfer.effectAllowed = "move";
        } catch {
          /* noop */
        }
      }}
      onDragEnd={() => {
        setDragId(null);
        arm.current = false;
      }}
      onDragOver={(e) => {
        if (!dragId || dragId === def.id) return;
        e.preventDefault();
        onReorder(def.id);
      }}
    >
      <header
        className="tile-head"
        title="DRAG TO REORDER"
        onMouseDown={() => {
          arm.current = true;
        }}
        onMouseUp={() => {
          arm.current = false;
        }}
      >
        <span className="tile-grip">
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span className="tile-title">{def.title}</span>
        <span className="tile-meta">{def.meta}</span>
        <span className="tile-acts">
          <button
            className="icon-btn"
            type="button"
            aria-label={`Hide tile ${def.title}`}
            onClick={(e) => {
              e.stopPropagation();
              layout.hide(def.id);
            }}
          >
            ×
          </button>
        </span>
      </header>
      <div className="tile-body">{def.render()}</div>
    </section>
  );
}

export function Grid({ defs }: { defs: TileDef[] }) {
  const layout = useLayout();
  const [dragId, setDragId] = useState<string | null>(null);
  const byId = new Map(defs.map((d) => [d.id, d]));

  const visible = layout.order.filter((id) => !layout.hidden.includes(id) && byId.has(id));

  const reorder = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const order = [...layout.order];
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, dragId);
    layout.setOrder(order);
  };

  return (
    <main id="grid" className="grid" aria-label="Dashboard canvas" onDrop={(e) => e.preventDefault()}>
      {visible.map((id, i) => {
        const def = byId.get(id)!;
        return (
          <Tile key={id} def={def} index={i} dragId={dragId} setDragId={setDragId} onReorder={reorder} />
        );
      })}
    </main>
  );
}
