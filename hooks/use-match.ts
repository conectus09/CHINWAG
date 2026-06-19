"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LONG_POLL_RETRY_MS,
  MATCH_BURST_POLL_MS,
  MATCH_POLL_INTERVAL_MS,
  type MatchResponse,
} from "@/lib/constants";
import { getUserProfile } from "@/lib/user-profile";

type MatchPhase = "idle" | "waiting" | "matched" | "partner_left";

interface UseMatchOptions {
  userId: string | null;
  autoStart?: boolean;
}

export function useMatch({ userId, autoStart = false }: UseMatchOptions) {
  const [phase, setPhase] = useState<MatchPhase>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerAge, setPartnerAge] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPollLoopRef = useRef(0);

  const applyResponse = useCallback((data: MatchResponse) => {
    if (data.status === "partner_left") {
      setPhase("partner_left");
      return;
    }

    setRoomId(data.roomId ?? null);
    setPartnerId(data.partnerId ?? null);
    setPartnerName(data.partnerName ?? null);
    setPartnerAge(data.partnerAge ?? null);
    setPhase(data.status === "idle" ? "idle" : data.status);
  }, []);

  const buildMatchBody = useCallback(
    (action: "join" | "next" | "leave") => {
      const profile = getUserProfile();
      return {
        userId,
        action,
        ...(profile ? { profile: { name: profile.name, age: profile.age } } : {}),
      };
    },
    [userId],
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    longPollLoopRef.current += 1;
  }, []);

  const fetchStatus = useCallback(
    async (useLongPoll = false) => {
      if (!userId) return null;

      const params = new URLSearchParams({ userId });
      if (useLongPoll) params.set("wait", "1");

      const response = await fetch(`/api/match?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch match status");
      }

      const data = (await response.json()) as MatchResponse;
      applyResponse(data);

      if (data.status === "idle") {
        stopPolling();
      }

      return data;
    },
    [applyResponse, stopPolling, userId],
  );

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      void fetchStatus(false).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Polling failed");
      });
    }, MATCH_POLL_INTERVAL_MS);
  }, [fetchStatus, stopPolling]);

  const joinQueue = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMatchBody("join")),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to join queue");
      }

      const data = (await response.json()) as MatchResponse;
      applyResponse(data);

      if (data.status === "waiting" || data.status === "matched") {
        startPolling();
      } else if (data.status === "idle") {
        stopPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setIsLoading(false);
    }
  }, [applyResponse, buildMatchBody, startPolling, stopPolling, userId]);

  const findNext = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    stopPolling();

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMatchBody("next")),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to find next match");
      }

      const data = (await response.json()) as MatchResponse;
      applyResponse(data);

      if (data.status === "waiting" || data.status === "matched") {
        startPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find next");
    } finally {
      setIsLoading(false);
    }
  }, [applyResponse, buildMatchBody, startPolling, stopPolling, userId]);

  const cancel = useCallback(async () => {
    if (!userId) return;
    stopPolling();
    setIsLoading(true);

    try {
      await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMatchBody("leave")),
      });
      setPhase("idle");
      setRoomId(null);
      setPartnerId(null);
      setPartnerName(null);
      setPartnerAge(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setIsLoading(false);
    }
  }, [buildMatchBody, stopPolling, userId]);

  const endChat = useCallback(async () => {
    await cancel();
  }, [cancel]);

  useEffect(() => {
    if (autoStart && userId && phase === "idle") {
      void joinQueue();
    }
  }, [autoStart, joinQueue, phase, userId]);

  useEffect(() => {
    if (phase !== "waiting" || !userId) return;

    const loopId = longPollLoopRef.current + 1;
    longPollLoopRef.current = loopId;
    let cancelled = false;

    void fetchStatus(false);

    const burst = window.setInterval(() => {
      void fetchStatus(false).catch(() => undefined);
    }, MATCH_BURST_POLL_MS);

    async function longPollLoop() {
      while (!cancelled && longPollLoopRef.current === loopId) {
        try {
          const data = await fetchStatus(true);
          if (!data || data.status !== "waiting") break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, LONG_POLL_RETRY_MS));
        }
      }
    }

    void longPollLoop();

    const stopBurst = window.setTimeout(() => {
      window.clearInterval(burst);
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(burst);
      window.clearTimeout(stopBurst);
    };
  }, [fetchStatus, phase, userId]);

  useEffect(() => {
    if (phase !== "partner_left") return;
    const timer = window.setTimeout(() => {
      void findNext();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [findNext, phase]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    phase,
    roomId,
    partnerId,
    partnerName,
    partnerAge,
    error,
    isLoading,
    joinQueue,
    findNext,
    cancel,
    endChat,
  };
}