// DPR-aware canvas renderers: sparkline + session chart (candles/line, MA, crosshair).
import { fmt } from "./market";

export const T = {
  ink: "#E6E1D5",
  ink2: "#A39D8F",
  mute: "#6E6A5E",
  gold: "#C9A46A",
  flare: "#E8470F",
  up: "#86B593",
  down: "#BC7362",
  cream: "#FBF6EA",
  line: "#1B2330",
};

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function sizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return null;
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export function sparkline(canvas: HTMLCanvasElement, pts: number[], color?: string) {
  const box = sizeCanvas(canvas);
  if (!box || pts.length < 2) return;
  const { ctx, w, h } = box;
  let min = Math.min(...pts);
  let max = Math.max(...pts);
  if (max - min < 1e-9) max = min + 1;
  const pad = 2;
  const up = pts[pts.length - 1] >= pts[0];
  const col = color ?? (up ? T.up : T.down);
  const X = (i: number) => pad + (i / (pts.length - 1)) * (w - pad * 2);
  const Y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, rgba(up ? "#86B593" : "#BC7362", 0.16));
  grad.addColorStop(1, rgba(up ? "#86B593" : "#BC7362", 0));
  ctx.beginPath();
  ctx.moveTo(X(0), Y(pts[0]));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(X(i), Y(pts[i]));
  ctx.lineTo(X(pts.length - 1), h);
  ctx.lineTo(X(0), h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(0), Y(pts[0]));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(X(i), Y(pts[i]));
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(pts.length - 1), Y(pts[pts.length - 1]), 1.8, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
}

export type ChartCandle = { d: string; o: number; h: number; l: number; c: number; v: number };
export type ChartType = "candles" | "line";

export class SessionChart {
  private canvas: HTMLCanvasElement;
  private data: ChartCandle[] = [];
  private hover = -1;
  private ro: ResizeObserver | null = null;
  type: ChartType = "candles";
  showMA = true;
  onHover: ((c: ChartCandle | null, idx: number) => void) | null = null;
  /** current display override for the last close (drift layer) */
  liveLast: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener("mousemove", (e) => {
      if (!this.data.length) return;
      const r = canvas.getBoundingClientRect();
      const g = this.geometry();
      const idx = Math.round((e.clientX - r.left - g.plotL) / g.step - 0.5);
      const clamped = Math.max(0, Math.min(this.data.length - 1, idx));
      if (clamped !== this.hover) {
        this.hover = clamped;
        this.draw();
      }
      this.onHover?.(this.data[clamped], clamped);
    });
    canvas.addEventListener("mouseleave", () => {
      this.hover = -1;
      this.draw();
      this.onHover?.(null, -1);
    });
    if ("ResizeObserver" in window) {
      this.ro = new ResizeObserver(() => this.draw());
      this.ro.observe(canvas);
    }
  }

  setData(d: ChartCandle[]) {
    this.data = d;
    this.draw();
  }

  destroy() {
    this.ro?.disconnect();
  }

  private geometry() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const axisW = 56;
    const volH = Math.round(h * 0.18);
    return {
      w, h,
      plotL: 6,
      plotR: w - axisW,
      plotT: 10,
      plotB: h - volH - 18,
      volT: h - volH - 10,
      volB: h - 12,
      step: (w - axisW - 12) / Math.max(1, this.data.length),
    };
  }

  private ma(period: number): (number | null)[] {
    const out: (number | null)[] = [];
    const d = this.data;
    for (let i = 0; i < d.length; i++) {
      if (i < period - 1) {
        out.push(null);
        continue;
      }
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += d[j].c;
      out.push(s / period);
    }
    return out;
  }

  draw() {
    const d = this.data;
    if (!d.length) return;
    const box = sizeCanvas(this.canvas);
    if (!box) return;
    const { ctx } = box;
    const g = this.geometry();
    const n = d.length;

    // apply live override for the last close
    const closes = d.map((c) => c.c);
    if (this.liveLast != null) closes[n - 1] = this.liveLast;

    let lo = Infinity;
    let hi = -Infinity;
    let vMax = 0;
    for (let i = 0; i < n; i++) {
      lo = Math.min(lo, d[i].l, closes[i]);
      hi = Math.max(hi, d[i].h, closes[i]);
      vMax = Math.max(vMax, d[i].v);
    }
    const pad = (hi - lo) * 0.06 || 1;
    lo -= pad;
    hi += pad;

    const X = (i: number) => g.plotL + (i + 0.5) * g.step;
    const Y = (v: number) => g.plotT + (1 - (v - lo) / (hi - lo)) * (g.plotB - g.plotT);

    ctx.clearRect(0, 0, g.w, g.h);

    ctx.font = '9.5px "IBM Plex Mono", monospace';
    ctx.fillStyle = T.mute;
    ctx.strokeStyle = rgba(T.line, 0.85);
    ctx.lineWidth = 1;
    const rows = 4;
    for (let r = 0; r <= rows; r++) {
      const val = lo + ((hi - lo) * r) / rows;
      const y = Y(val);
      ctx.beginPath();
      ctx.moveTo(g.plotL, y + 0.5);
      ctx.lineTo(g.plotR, y + 0.5);
      ctx.stroke();
      ctx.fillText(fmt(val, 2), g.plotR + 8, y + 3);
    }

    const bw = Math.max(1, g.step * 0.62);
    for (let i = 0; i < n; i++) {
      const vh = (d[i].v / vMax) * (g.volB - g.volT);
      ctx.fillStyle = closes[i] >= d[i].o ? rgba("#86B593", 0.3) : rgba("#BC7362", 0.3);
      ctx.fillRect(X(i) - bw / 2, g.volB - vh, bw, vh);
    }

    if (this.type === "line") {
      ctx.beginPath();
      ctx.moveTo(X(0), Y(closes[0]));
      for (let i = 1; i < n; i++) ctx.lineTo(X(i), Y(closes[i]));
      ctx.strokeStyle = T.gold;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.stroke();
      const grad = ctx.createLinearGradient(0, g.plotT, 0, g.plotB);
      grad.addColorStop(0, rgba("#C9A46A", 0.14));
      grad.addColorStop(1, rgba("#C9A46A", 0));
      ctx.lineTo(X(n - 1), g.plotB);
      ctx.lineTo(X(0), g.plotB);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      for (let i = 0; i < n; i++) {
        const up = closes[i] >= d[i].o;
        const col = up ? T.up : T.down;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(X(i), Y(d[i].h));
        ctx.lineTo(X(i), Y(d[i].l));
        ctx.stroke();
        const yO = Y(d[i].o);
        const yC = Y(closes[i]);
        const top = Math.min(yO, yC);
        const hgt = Math.max(1, Math.abs(yC - yO));
        ctx.fillStyle = up ? rgba("#86B593", 0.85) : rgba("#BC7362", 0.85);
        ctx.fillRect(X(i) - bw / 2, top, bw, hgt);
      }
    }

    if (this.showMA) {
      const src = d.map((c, i) => ({ ...c, c: closes[i] }));
      const saved = this.data;
      this.data = src;
      const ma = this.ma(20);
      this.data = saved;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        if (ma[i] == null) continue;
        if (!started) {
          ctx.moveTo(X(i), Y(ma[i]!));
          started = true;
        } else ctx.lineTo(X(i), Y(ma[i]!));
      }
      ctx.strokeStyle = T.gold;
      ctx.lineWidth = 1.1;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // last price (single flare accent)
    const lastC = closes[n - 1];
    const yL = Y(lastC);
    ctx.strokeStyle = T.flare;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(g.plotL, yL + 0.5);
    ctx.lineTo(g.plotR, yL + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    const tag = fmt(lastC, 2);
    const tw = ctx.measureText(tag).width + 10;
    ctx.fillStyle = T.flare;
    ctx.fillRect(g.plotR + 1, yL - 7, tw, 14);
    ctx.fillStyle = T.cream;
    ctx.fillText(tag, g.plotR + 6, yL + 3);

    if (this.hover >= 0 && this.hover < n) {
      const hx = X(this.hover);
      ctx.strokeStyle = rgba("#A39D8F", 0.55);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx + 0.5, g.plotT);
      ctx.lineTo(hx + 0.5, g.volB);
      ctx.stroke();
      const hy = Y(closes[this.hover]);
      ctx.beginPath();
      ctx.moveTo(g.plotL, hy + 0.5);
      ctx.lineTo(g.plotR, hy + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(hx, hy, 3, 0, Math.PI * 2);
      ctx.fillStyle = T.gold;
      ctx.fill();
    }
  }
}
