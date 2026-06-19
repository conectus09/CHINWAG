"use client";

import { useEffect, useState } from "react";
import { connectPresenceSocket, getPresenceSocket } from "@/lib/presence-client";

let subscriberCount = 0;

/**
 * Subscribes to real-time `online_count` events from the Socket.io server.
 * Falls back to /api/stats polling when the socket is unreachable.
 */
export function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getPresenceSocket();
    subscriberCount += 1;

    const onCount = (value: number) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        setCount(Math.max(0, value));
      }
    };

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    if (socket) {
      socket.on("online_count", onCount);
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      connectPresenceSocket();
      if (socket.connected) setConnected(true);
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { online?: number };
        if (!cancelled && typeof data.online === "number") {
          setCount((prev) =>
            prev === null || !socket?.connected ? data.online! : prev,
          );
        }
      } catch {
        // ignore
      }
    };
    void poll();
    const pollTimer = window.setInterval(() => void poll(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      if (socket) {
        socket.off("online_count", onCount);
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        subscriberCount -= 1;
        if (subscriberCount <= 0 && socket.connected) {
          socket.disconnect();
          subscriberCount = 0;
        }
      } else {
        subscriberCount -= 1;
      }
    };
  }, []);

  return { count, connected };
}