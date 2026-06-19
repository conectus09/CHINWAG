"use client";

import { useEffect, useState } from "react";

interface Stats {
  online: number;
  waiting: number;
  chatting: number;
}

export function LiveOnlineCounter({ className = "" }: { className?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) return;
        const data = (await response.json()) as Stats;
        if (!cancelled) setStats(data);
      } catch {
        // keep last value
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const online = stats?.online ?? 0;
  const waiting = stats?.waiting ?? 0;
  const chatting = stats?.chatting ?? 0;

  return (
    <div
      className={`live-counter inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 sm:gap-2.5 sm:px-3 sm:py-1.5 ${className}`}
      aria-live="polite"
    >
      <span className="live-counter-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]">
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
          <span className="live-counter-ping absolute inline-flex h-full w-full rounded-full" />
          <span className="live-counter-dot relative inline-flex h-1.5 w-1.5 rounded-full" />
        </span>
        Live
      </span>

      <span className="live-counter-divider hidden h-3 w-px sm:block" aria-hidden />

      <p className="live-counter-copy whitespace-nowrap text-xs sm:text-[13px]">
        <span className="live-counter-number font-semibold tabular-nums">
          {online.toLocaleString("en-US")}
        </span>
        <span className="live-counter-label"> online</span>
        {online > 0 && (
          <span className="live-counter-label hidden sm:inline">
            {" "}
            · {chatting} chatting · {waiting} waiting
          </span>
        )}
      </p>
    </div>
  );
}