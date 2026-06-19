"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

let sharedSocket: Socket | null = null;
let subscriberCount = 0;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });
  }
  return sharedSocket;
}

/**
 * Subscribes to real-time `online_count` events from the Socket.io server.
 * Falls back to /api/stats polling when the socket is unreachable.
 */
export function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    subscriberCount += 1;

    const onCount = (value: number) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        setCount(Math.max(0, value));
      }
    };

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("online_count", onCount);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      setConnected(true);
    } else {
      socket.connect();
    }

    // Fallback poll if socket server is down
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { online?: number };
        if (!cancelled && typeof data.online === "number") {
          setCount((prev) => prev ?? data.online!);
        }
      } catch {
        // ignore
      }
    };
    void poll();
    const pollTimer = window.setInterval(() => void poll(), 15000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      socket.off("online_count", onCount);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      subscriberCount -= 1;
      if (subscriberCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        subscriberCount = 0;
      }
    };
  }, []);

  return { count, connected };
}