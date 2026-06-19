"use client";

import { useEffect } from "react";
import { LIVE_PRESENCE_HEARTBEAT_MS } from "@/lib/constants";
import { getLivePresenceId } from "@/lib/presence-session";

async function sendHeartbeat(sessionId: string) {
  try {
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "heartbeat" }),
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}

/** Keeps this browser counted as 1 real online user site-wide. */
export function LivePresenceTracker() {
  useEffect(() => {
    const sessionId = getLivePresenceId();
    if (!sessionId) return;

    const beat = () => void sendHeartbeat(sessionId);

    beat();
    const timer = window.setInterval(beat, LIVE_PRESENCE_HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    const onLeave = () => {
      const body = JSON.stringify({ sessionId, action: "leave" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/presence", new Blob([body], { type: "application/json" }));
      }
    };
    window.addEventListener("pagehide", onLeave);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onLeave);
    };
  }, []);

  return null;
}