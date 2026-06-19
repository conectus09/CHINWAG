"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePollingChat } from "@/hooks/use-polling-chat";
import { useWebRtc } from "@/hooks/use-webrtc";
import { WhatsAppChatShell } from "@/components/whatsapp-chat-shell";
import { getUserProfile } from "@/lib/user-profile";
import { cn } from "@/lib/utils";

interface WhatsAppChatPollingProps {
  roomId: string;
  userId: string;
  partnerId: string | null;
  partnerName?: string | null;
  partnerAge?: number | null;
  partnerLeft?: boolean;
  icebreaker?: string | null;
  commonInterests?: string[];
  onNext: () => void;
  onEndChat: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export function WhatsAppChatPolling({
  roomId,
  userId,
  partnerId,
  partnerName,
  partnerAge,
  partnerLeft,
  icebreaker,
  commonInterests,
  onNext,
  onEndChat,
  onBack,
  isLoading,
}: WhatsAppChatPollingProps) {
  const [draft, setDraft] = useState("");
  const [callMode, setCallMode] = useState<"voice" | "video" | null>(null);
  const [partnerLeftMessage, setPartnerLeftMessage] = useState<string | null>(null);
  const partnerLeftShownRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const profile = getUserProfile();

  const {
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
  } = usePollingChat({ roomId, userId, partnerId });

  const { localStream, remoteStream, status: callStatus, stop: stopCall } = useWebRtc({
    roomId,
    userId,
    partnerId,
    enabled: Boolean(callMode && partnerId),
    mode: callMode,
  });

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const partnerHasLeft = partnerLeftMessage != null;
  const canSend = isConnected && !isLoading && !isSending && !partnerHasLeft;

  const showPartnerLeftNotice = useCallback(() => {
    if (partnerLeftShownRef.current) return;
    partnerLeftShownRef.current = true;
    const name = (partnerName ?? "Stranger").toUpperCase();
    setPartnerLeftMessage(`OOPS THE ${name} LEFT THE CHAT`);
  }, [partnerName]);

  useEffect(() => {
    if (partnerLeft) {
      showPartnerLeftNotice();
    }
  }, [partnerLeft, showPartnerLeftNotice]);

  const handleReport = useCallback(
    async (reason: string) => {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: userId,
          reportedId: partnerId ?? undefined,
          roomId,
          reason,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Report failed");
      }
    },
    [partnerId, roomId, userId],
  );

  const statusText = partnerTyping
    ? "typing..."
    : isConnected && partnerId
      ? "online"
      : "connecting...";

  const statusClassName = partnerTyping
    ? "text-sky-400"
    : isConnected && partnerId
      ? "text-emerald-400"
      : "text-amber-400";

  return (
    <WhatsAppChatShell
      userId={userId}
      partnerId={partnerId}
      localName={profile?.name}
      localAge={profile?.age}
      partnerName={partnerName}
      partnerAge={partnerAge}
      partnerLeftMessage={partnerLeftMessage}
      partnerTyping={partnerTyping}
      statusText={statusText}
      statusClassName={cn(statusClassName)}
      isConnected={isConnected}
      messages={messages}
      draft={draft}
      onDraftChange={(value) => {
        setDraft(value);
        if (sendError) setSendError(null);
        handleDraftChange(value, canSend);
      }}
      canSend={canSend}
      isSending={isSending}
      sendError={sendError}
      onSend={() => {
        void sendMessage(draft, canSend).then((sent) => {
          if (sent) setDraft("");
        });
      }}
      onNext={onNext}
      onEndChat={onEndChat}
      onBack={onBack}
      onReport={handleReport}
      onReaction={(messageId, reaction) => void sendReaction(messageId, reaction)}
      onPickEmoji={(emoji) => setDraft((prev) => `${prev}${emoji}`)}
      onPickImage={(dataUrl) => void sendImage(dataUrl, canSend)}
      icebreaker={icebreaker}
      commonInterests={commonInterests}
      callMode={callMode}
      onStartCall={(mode) => setCallMode(mode)}
      onStopCall={() => {
        stopCall();
        setCallMode(null);
      }}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
      callStatus={
        callMode
          ? callStatus === "live"
            ? `${callMode} call live`
            : `Starting ${callMode} call...`
          : null
      }
      roomId={roomId}
      isLoading={isLoading}
    />
  );
}