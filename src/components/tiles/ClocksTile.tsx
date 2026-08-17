import { useEffect, useState } from "react";
import { pad2 } from "@/lib/market";

const MARKETS = [
  { city: "NEW YORK", tz: "America/New_York", open: 9.5, close: 16 },
  { city: "LONDON", tz: "Europe/London", open: 8, close: 16.5 },
  { city: "FRANKFURT", tz: "Europe/Berlin", open: 9, close: 17.5 },
  { city: "TOKYO", tz: "Asia/Tokyo", open: 9, close: 15 },
  { city: "HONG KONG", tz: "Asia/Hong_Kong", open: 9.5, close: 16 },
  { city: "SYDNEY", tz: "Australia/Sydney", open: 10, close: 16 },
];

function localParts(tz: string) {
  try {
    const f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "shortOffset",
    });
    const o: Record<string, string> = {};
    for (const p of f.formatToParts(new Date())) o[p.type] = p.value;
    return {
      h: parseInt(o.hour === "24" ? "0" : o.hour, 10),
      m: parseInt(o.minute, 10),
      s: parseInt(o.second, 10),
      wd: o.weekday,
      off: (o.timeZoneName || "").replace("GMT", "UTC"),
    };
  } catch {
    const d = new Date();
    return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), wd: "—", off: "LOCAL" };
  }
}

function ClockRow({ mk }: { mk: (typeof MARKETS)[number] }) {
  const p = localParts(mk.tz);
  const t = p.h + p.m / 60 + p.s / 3600;
  const isWday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(p.wd);
  const open = isWday && t >= mk.open && t < mk.close;
  let countdown = "";
  if (open) {
    const left = mk.close - t;
    countdown = `CLOSES IN ${Math.floor(left)}H ${pad2(Math.round((left % 1) * 60))}M`;
  } else {
    let toOpen: number;
    if (isWday && t < mk.open) toOpen = mk.open - t;
    else toOpen = 24 - t + mk.open;
    if (p.wd === "Fri" && t >= mk.close) toOpen += 48;
    else if (p.wd === "Sat") toOpen += 24;
    countdown =
      toOpen < 24
        ? `OPENS IN ${Math.floor(toOpen)}H ${pad2(Math.round((toOpen % 1) * 60))}M`
        : "OPENS AFTER WEEKEND";
  }
  return (
    <div className="ck-cell">
      <div className="ck-top">
        <div className="ck-left">
          <span className="ck-city">{mk.city}</span>
          <span className="ck-off">{p.off}</span>
        </div>
        <div className="ck-mid">
          <span className="ck-time">
            {pad2(p.h)}:{pad2(p.m)}:{pad2(p.s)}
          </span>
          <span className={`ck-status ${open ? "open" : "closed"}`}>
            <i className={`dot ${open ? "open" : "closed"}`}></i>
            {open ? "OPEN" : "CLOSED"} · {countdown}
          </span>
        </div>
      </div>
      <div className="ck-bar">
        <div
          className="ck-bar-seg"
          style={{ left: `${(mk.open / 24) * 100}%`, width: `${((mk.close - mk.open) / 24) * 100}%` }}
        />
        <div className="ck-bar-now" style={{ left: `${(t / 24) * 100}%` }} />
      </div>
    </div>
  );
}

export function ClocksTile() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      {MARKETS.map((mk) => (
        <ClockRow key={mk.city} mk={mk} />
      ))}
    </div>
  );
}
