"use client";

import { useOnlineCount } from "@/hooks/use-online-count";
import { formatOnlineLabel, formatOnlineShort } from "@/lib/format-online";

interface LiveOnlineCounterProps {
  className?: string;
  variant?: "default" | "compact";
}

export function LiveOnlineCounter({
  className = "",
  variant = "default",
}: LiveOnlineCounterProps) {
  const { count, waiting, chatting, source, loading } = useOnlineCount();
  const label = variant === "compact" ? formatOnlineShort(count) : formatOnlineLabel(count);

  return (
    <div
      className={`live-counter live-counter-real inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 sm:gap-2.5 sm:px-3 sm:py-1.5 ${className}`}
      aria-live="polite"
      title={
        waiting > 0 || chatting > 0
          ? `${waiting} waiting · ${chatting} in chat`
          : "Real-time visitors on Chinwag"
      }
    >
      <span className="live-counter-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]">
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
          <span
            className={`live-counter-ping absolute inline-flex h-full w-full rounded-full ${
              loading ? "live-counter-ping-muted" : ""
            }`}
          />
          <span
            className={`live-counter-dot relative inline-flex h-1.5 w-1.5 rounded-full ${
              loading ? "live-counter-dot-muted" : ""
            }`}
          />
        </span>
        Live
      </span>

      <span className="live-counter-divider hidden h-3 w-px sm:block" aria-hidden />

      <p className="live-counter-copy whitespace-nowrap text-xs sm:text-[13px]">
        {loading ? (
          <span className="live-counter-label">Counting visitors…</span>
        ) : (
          <>
            <span
              className="live-counter-number font-semibold tabular-nums"
              suppressHydrationWarning
            >
              {count.toLocaleString("en-US")}
            </span>
            <span className="live-counter-label">
              {count === 1 ? " person online right now" : " people online right now"}
            </span>
          </>
        )}
      </p>

      {!loading && source === "heartbeat" && variant === "default" && (
        <span className="live-counter-real-badge hidden sm:inline" aria-hidden>
          Real
        </span>
      )}

      <span className="sr-only">{label}</span>
    </div>
  );
}