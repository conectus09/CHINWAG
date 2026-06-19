"use client";

import { useCallback, useEffect, useState } from "react";

export interface OnlineCountState {
  count: number;
  waiting: number;
  chatting: number;
  source: "heartbeat" | "socket" | "none";
  loading: boolean;
}

const POLL_MS = 3000;

export function useOnlineCount(): OnlineCountState {
  const [state, setState] = useState<OnlineCountState>({
    count: 0,
    waiting: 0,
    chatting: 0,
    source: "none",
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/presence", { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as {
        online?: number;
        waiting?: number;
        chatting?: number;
        source?: "heartbeat" | "socket" | "none";
      };

      if (typeof data.online !== "number") return;

      setState({
        count: Math.max(0, data.online),
        waiting: Math.max(0, data.waiting ?? 0),
        chatting: Math.max(0, data.chatting ?? 0),
        source: data.source ?? "heartbeat",
        loading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return state;
}