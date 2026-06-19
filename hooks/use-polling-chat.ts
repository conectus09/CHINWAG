"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_POLL_INTERVAL_MS,
  LONG_POLL_RETRY_MS,
  TYPING_HEARTBEAT_MS,
  TYPING_IDLE_MS,
} from "@/lib/constants";
import type { ChatMessage } from "@/components/whatsapp-chat-shell";
import { useSoundNotification } from "@/hooks/use-sound-notification";
import { readAuthSession } from "@/lib/auth-client";
import { readGuestSession } from "@/lib/guest-session";

interface UsePollingChatOptions {
  roomId: string;
  userId: string;
  partnerId: string | null;
  enabled?: boolean;
}

export function usePollingChat({
  roomId,
  userId,
  partnerId,
  enabled = true,
}: UsePollingChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const lastTimestampRef = useRef(0);
  const isTypingRef = useRef(false);
  const lastTypingSentRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollLoopRef = useRef(0);
  const longPollInFlightRef = useRef(false);
  const knownIdsRef = useRef(new Set<string>());
  const { play } = useSoundNotification();

  useEffect(() => {
    if (enabled && partnerId) {
      setIsConnected(true);
    }
  }, [enabled, partnerId]);

  const applySnapshot = useCallback(
    (data: {
      messages: Array<{
        id: string;
        sender: string;
        text: string;
        timestamp: number;
        kind?: ChatMessage["kind"];
        imageUrl?: string;
        reaction?: string;
        readBy?: string[];
      }>;
      partnerTyping: boolean;
    }) => {
      setIsConnected(true);
      setPartnerTyping(data.partnerTyping);

      if (data.messages.length > 0) {
        setMessages((prev) => {
          const merged = [...prev];
          for (const message of data.messages) {
            const existingIndex = merged.findIndex((entry) => entry.id === message.id);
            if (existingIndex !== -1) {
              merged[existingIndex] = {
                ...merged[existingIndex],
                ...message,
                isLocal: message.sender === userId,
              };
              continue;
            }

            if (!knownIdsRef.current.has(message.id) && message.sender !== userId) {
              const isGuest = !readAuthSession();
              if (!isGuest || readGuestSession().soundEnabled) {
                play();
              }
            }
            knownIdsRef.current.add(message.id);

            merged.push({
              ...message,
              isLocal: message.sender === userId,
            });
            lastTimestampRef.current = Math.max(
              lastTimestampRef.current,
              message.timestamp,
            );
          }
          return merged;
        });
      }
    },
    [play, userId],
  );

  const pollOnce = useCallback(
    async (useLongPoll: boolean) => {
      const params = new URLSearchParams({
        roomId,
        since: String(lastTimestampRef.current),
        readerId: userId,
      });
      if (partnerId) params.set("partnerId", partnerId);
      if (useLongPoll) params.set("wait", "1");

      const response = await fetch(`/api/chat?${params.toString()}`);
      if (!response.ok) throw new Error("Poll failed");

      const data = (await response.json()) as {
        messages: Array<{
          id: string;
          sender: string;
          text: string;
          timestamp: number;
          kind?: ChatMessage["kind"];
          imageUrl?: string;
          reaction?: string;
          readBy?: string[];
        }>;
        partnerTyping: boolean;
      };

      applySnapshot(data);
    },
    [applySnapshot, partnerId, roomId, userId],
  );

  const sendTyping = useCallback(
    async (active: boolean) => {
      if (!enabled) return;

      try {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            userId,
            action: "typing",
            active,
          }),
        });
      } catch {
        // typing is best-effort
      }
    },
    [enabled, roomId, userId],
  );

  const stopLocalTyping = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      void sendTyping(false);
    }
  }, [sendTyping]);

  useEffect(() => {
    if (!enabled) return;

    const loopId = pollLoopRef.current + 1;
    pollLoopRef.current = loopId;
    let cancelled = false;

    const shortPoll = () => {
      void pollOnce(false)
        .catch(() => undefined);
    };

    async function longPollLoop() {
      while (!cancelled && pollLoopRef.current === loopId) {
        if (longPollInFlightRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          continue;
        }

        longPollInFlightRef.current = true;
        try {
          await pollOnce(true);
        } catch {
          if (!cancelled) {
            await new Promise((resolve) =>
              setTimeout(resolve, LONG_POLL_RETRY_MS),
            );
          }
        } finally {
          longPollInFlightRef.current = false;
        }
      }
    }

    shortPoll();
    void longPollLoop();

    const shortTimer = window.setInterval(shortPoll, CHAT_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        shortPoll();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(shortTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, pollOnce]);

  const handleDraftChange = useCallback(
    (value: string, canSend: boolean) => {
      if (!canSend) return;

      if (!value.trim()) {
        stopLocalTyping();
        return;
      }

      const now = Date.now();
      if (
        !isTypingRef.current ||
        now - lastTypingSentRef.current > TYPING_HEARTBEAT_MS
      ) {
        isTypingRef.current = true;
        lastTypingSentRef.current = now;
        void sendTyping(true);
      }

      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      typingStopTimerRef.current = setTimeout(() => {
        stopLocalTyping();
      }, TYPING_IDLE_MS);
    },
    [sendTyping, stopLocalTyping],
  );

  const sendMessage = useCallback(
    async (text: string, canSend: boolean) => {
      const trimmed = text.trim();
      if (!trimmed || !canSend) return false;

      setIsSending(true);
      setSendError(null);
      stopLocalTyping();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            userId,
            action: "message",
            text: trimmed,
          }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Send failed");
        }

        const data = (await response.json()) as {
          message: ChatMessage;
        };

        knownIdsRef.current.add(data.message.id);
        setMessages((prev) => {
          if (prev.some((entry) => entry.id === data.message.id)) return prev;
          lastTimestampRef.current = Math.max(
            lastTimestampRef.current,
            data.message.timestamp,
          );
          return [
            ...prev,
            {
              ...data.message,
              isLocal: true,
            },
          ];
        });

        void pollOnce(true).catch(() => undefined);

        return true;
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Message failed to send. Try again.");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [pollOnce, roomId, stopLocalTyping, userId],
  );

  const sendImage = useCallback(
    async (imageUrl: string, canSend: boolean) => {
      if (!canSend) return false;
      setIsSending(true);
      setSendError(null);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, userId, action: "image", imageUrl }),
        });
        if (!response.ok) throw new Error("Image send failed");
        const data = (await response.json()) as { message: ChatMessage };
        setMessages((prev) => [...prev, { ...data.message, isLocal: true }]);
        return true;
      } catch {
        setSendError("Image failed to send.");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [roomId, userId],
  );

  const sendReaction = useCallback(
    async (messageId: string, reaction: string) => {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, userId, action: "reaction", messageId, reaction }),
      });
      void pollOnce(false);
    },
    [pollOnce, roomId, userId],
  );

  useEffect(
    () => () => {
      stopLocalTyping();
    },
    [stopLocalTyping],
  );

  return {
    messages,
    partnerTyping,
    isConnected,
    sendError,
    isSending,
    handleDraftChange,
    sendMessage,
    sendImage,
    sendReaction,
    setSendError,
  };
}