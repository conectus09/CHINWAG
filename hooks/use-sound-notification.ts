"use client";

import { useCallback, useRef } from "react";

export function useSoundNotification() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.04;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
    } catch {
      // audio optional
    }
  }, []);

  return { play };
}