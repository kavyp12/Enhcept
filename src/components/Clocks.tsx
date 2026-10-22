"use client";

import { useSyncExternalStore } from "react";

const ZONES = [["AMD", "Asia/Kolkata"], ["LON", "Europe/London"], ["NYC", "America/New_York"], ["TOR", "America/Toronto"], ["DXB", "Asia/Dubai"], ["SYD", "Australia/Sydney"]];

// The current minute as a shared store: "--:--" on the server, live in the browser.
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 10_000);
  return () => clearInterval(id);
};
const useMinute = () => useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 60_000), () => 0);

export function Clocks() {
  const minute = useMinute();
  return (
    <ul className="clocks" aria-label="Local times in our markets">
      {ZONES.map(([code, timeZone]) => (
        <li key={code}>
          <b>{code}</b>
          <time>{minute ? new Date(minute * 60_000).toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }) : "--:--"}</time>
        </li>
      ))}
    </ul>
  );
}

export function Year() {
  const minute = useMinute();
  return <>{minute ? new Date(minute * 60_000).getFullYear() : 2026}</>;
}
