"use client";

import { useOnlineCount } from "@/hooks/use-online-count";

export function LiveOnlineCounter({ className = "" }: { className?: string }) {
  const { count } = useOnlineCount();
  const displayCount = count ?? 0;

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
        <span
          className="live-counter-number font-semibold tabular-nums"
          suppressHydrationWarning
        >
          {displayCount.toLocaleString("en-US")}
        </span>
        <span className="live-counter-label"> people online right now</span>
      </p>
    </div>
  );
}