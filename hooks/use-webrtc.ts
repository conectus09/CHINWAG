"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebRtcOptions {
  roomId: string;
  userId: string;
  partnerId: string | null;
  enabled: boolean;
  mode: "voice" | "video" | null;
}

export function useWebRtc({
  roomId,
  userId,
  partnerId,
  enabled,
  mode,
}: UseWebRtcOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sinceRef = useRef(0);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setStatus("idle");
  }, [localStream]);

  const sendSignal = useCallback(
    async (type: "offer" | "answer" | "ice", payload: string) => {
      if (!partnerId) return;
      await fetch("/api/webrtc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, from: userId, to: partnerId, type, payload }),
      });
    },
    [partnerId, roomId, userId],
  );

  const pollSignals = useCallback(async () => {
    if (!partnerId) return;
    const response = await fetch(
      `/api/webrtc?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}&since=${sinceRef.current}`,
    );
    if (!response.ok) return;
    const data = (await response.json()) as {
      signals: Array<{
        type: "offer" | "answer" | "ice";
        payload: string;
        from: string;
        createdAt: number;
      }>;
    };

    const pc = pcRef.current;
    if (!pc) return;

    for (const signal of data.signals) {
      sinceRef.current = Math.max(sinceRef.current, signal.createdAt);
      if (signal.type === "offer") {
        await pc.setRemoteDescription(JSON.parse(signal.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", JSON.stringify(answer));
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(JSON.parse(signal.payload));
      } else if (signal.type === "ice") {
        await pc.addIceCandidate(JSON.parse(signal.payload));
      }
    }
  }, [partnerId, roomId, sendSignal, userId]);

  const start = useCallback(async () => {
    if (!enabled || !partnerId || !mode) return;
    cleanup();
    setStatus("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (remote) {
          setRemoteStream(remote);
          setStatus("live");
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal("ice", JSON.stringify(event.candidate));
        }
      };

      if (userId < partnerId) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", JSON.stringify(offer));
      }
    } catch {
      setStatus("error");
    }
  }, [cleanup, enabled, mode, partnerId, sendSignal, userId]);

  useEffect(() => {
    if (!enabled || !mode || !partnerId) {
      cleanup();
      return;
    }

    void start();
    const timer = window.setInterval(() => {
      void pollSignals();
    }, 1200);

    return () => {
      window.clearInterval(timer);
      cleanup();
    };
  }, [cleanup, enabled, mode, partnerId, pollSignals, start]);

  return { localStream, remoteStream, status, start, stop: cleanup };
}