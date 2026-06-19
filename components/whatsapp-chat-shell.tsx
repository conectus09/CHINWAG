"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Flag,
  Phone,
  PhoneOff,
  SkipForward,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatAvatar } from "@/components/chat-avatar";
import { EmojiPicker } from "@/components/emoji-picker";
import { ReportModal } from "@/components/report-modal";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
  kind?: "text" | "image" | "reaction" | "system";
  imageUrl?: string;
  reaction?: string;
  readBy?: string[];
}

interface WhatsAppChatShellProps {
  userId: string;
  partnerId: string | null;
  localName?: string | null;
  localAge?: number | null;
  partnerName?: string | null;
  partnerAge?: number | null;
  partnerLeftMessage: string | null;
  partnerTyping: boolean;
  statusText: string;
  statusClassName: string;
  isConnected: boolean;
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  canSend: boolean;
  isSending: boolean;
  sendError: string | null;
  onSend: () => void;
  onNext: () => void;
  onEndChat: () => void;
  onBack?: () => void;
  onReport: (reason: string) => Promise<void>;
  onReaction?: (messageId: string, reaction: string) => void;
  onPickEmoji?: (emoji: string) => void;
  onPickImage?: (dataUrl: string) => void;
  icebreaker?: string | null;
  commonInterests?: string[];
  callMode?: "voice" | "video" | null;
  onStartCall?: (mode: "voice" | "video") => void;
  onStopCall?: () => void;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  callStatus?: string | null;
  isLoading?: boolean;
  embedded?: boolean;
  waitingPreview?: boolean;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WhatsAppChatShell({
  userId,
  partnerId,
  localName,
  localAge,
  partnerName,
  partnerAge,
  partnerLeftMessage,
  partnerTyping,
  statusText,
  statusClassName,
  isConnected,
  messages,
  draft,
  onDraftChange,
  canSend,
  isSending,
  sendError,
  onSend,
  onNext,
  onEndChat,
  onBack,
  onReport,
  onReaction,
  onPickEmoji,
  onPickImage,
  icebreaker,
  commonInterests,
  callMode,
  onStartCall,
  onStopCall,
  localVideoRef,
  remoteVideoRef,
  callStatus,
  isLoading,
  embedded = false,
  waitingPreview = false,
}: WhatsAppChatShellProps) {
  const [upgradeTier, setUpgradeTier] = useState<"pro" | "max" | null>(null);
  const [endChatConfirm, setEndChatConfirm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const partnerHasLeft = partnerLeftMessage != null;
  const bothConnected = partnerId != null && !partnerHasLeft;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, partnerLeftMessage, partnerTyping, scrollToBottom]);

  useEffect(() => {
    if (!endChatConfirm) return;
    const timer = window.setTimeout(() => setEndChatConfirm(false), 5000);
    return () => window.clearTimeout(timer);
  }, [endChatConfirm]);

  useEffect(() => {
    if (!upgradeTier) return;
    const timer = window.setTimeout(() => setUpgradeTier(null), 3000);
    return () => window.clearTimeout(timer);
  }, [upgradeTier]);

  const handleEndChatClick = useCallback(() => {
    if (endChatConfirm) {
      setEndChatConfirm(false);
      onEndChat();
      return;
    }
    setEndChatConfirm(true);
  }, [endChatConfirm, onEndChat]);

  const handleReportSubmit = useCallback(
    async (reason: string) => {
      await onReport(reason);
      setReportOpen(false);
      onNext();
    },
    [onNext, onReport],
  );

  return (
    <>
      <div
        className={cn(
          "whatsapp-chat flex w-full overflow-hidden",
          embedded ? "whatsapp-chat-embedded h-full" : "h-dvh",
          waitingPreview && "whatsapp-chat-waiting-preview",
        )}
      >
        <div className="whatsapp-split flex h-full w-full overflow-hidden">
          <aside className="whatsapp-video-box w-[30%] shrink-0">
            <div className="whatsapp-connection-panel">
              <p className="whatsapp-connection-title">LIVE MATCH</p>

              <div className="whatsapp-connection-users">
                <div className="whatsapp-connection-user">
                  <ChatAvatar
                    userId={userId}
                    label={localName ?? "You"}
                    size="lg"
                    online={bothConnected}
                  />
                  <p className="whatsapp-connection-name">{localName ?? "You"}</p>
                  {localAge != null && (
                    <span className="whatsapp-connection-age">{localAge}</span>
                  )}
                </div>

                <div
                  className={cn(
                    "whatsapp-connection-bridge",
                    bothConnected && "whatsapp-connection-bridge-live",
                  )}
                  aria-hidden
                >
                  <span className="whatsapp-connection-dot" />
                  <span className="whatsapp-connection-line" />
                  <span className="whatsapp-connection-dot" />
                </div>

                <div className="whatsapp-connection-user">
                  <ChatAvatar
                    userId={partnerId ?? "waiting"}
                    label={partnerName ?? "Stranger"}
                    size="lg"
                    online={bothConnected}
                  />
                  <p className="whatsapp-connection-name">
                    {partnerName ?? "Stranger"}
                  </p>
                  {partnerAge != null && (
                    <span className="whatsapp-connection-age">{partnerAge}</span>
                  )}
                </div>
              </div>

              <p
                className={cn(
                  "whatsapp-connection-status",
                  bothConnected
                    ? "whatsapp-connection-status-live"
                    : waitingPreview
                      ? "whatsapp-connection-status-search"
                      : "whatsapp-connection-status-wait",
                )}
              >
                {callStatus ??
                  (bothConnected
                    ? "Connected — chat is live"
                    : partnerHasLeft
                      ? "Partner disconnected"
                      : waitingPreview
                        ? "Scanning for someone online..."
                        : "Linking strangers...")}
              </p>

              {(callMode === "video" || callMode === "voice") && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-20 w-full rounded-lg bg-black/40 object-cover"
                  />
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-20 w-full rounded-lg bg-black/40 object-cover"
                  />
                </div>
              )}

              {commonInterests && commonInterests.length > 0 && (
                <p className="mt-2 text-center text-[11px] text-sky-200">
                  You both like: {commonInterests.join(", ")}
                </p>
              )}
            </div>
          </aside>

          <div
            className={cn(
              "whatsapp-chat-panel w-[70%] min-w-0 shrink-0",
              embedded && "whatsapp-chat-panel-embedded",
            )}
          >
            <header className="whatsapp-header flex shrink-0 items-center gap-2 px-2 py-3 sm:px-4">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-card-hover"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}

              <ChatAvatar
                userId={partnerId ?? "partner"}
                label={partnerName ?? "Stranger"}
                size="sm"
                online={bothConnected}
              />

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-semibold text-foreground">
                    {partnerName ?? "Stranger"}
                  </p>
                  {partnerAge != null && (
                    <span className="whatsapp-partner-age shrink-0">
                      {partnerAge}
                    </span>
                  )}
                </div>
                <p className={cn("text-xs", statusClassName)}>{statusText}</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  disabled={!partnerId || partnerHasLeft}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-card-hover hover:text-amber-300 disabled:opacity-40"
                  aria-label="Report user"
                >
                  <Flag className="h-4 w-4" />
                </button>

                <ThemeSwitcher variant="chat" />

                <button
                  type="button"
                  onClick={() =>
                    callMode === "voice" ? onStopCall?.() : onStartCall?.("voice")
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-card-hover hover:text-foreground"
                  aria-label="Voice call"
                >
                  <Phone className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    callMode === "video" ? onStopCall?.() : onStartCall?.("video")
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-card-hover hover:text-foreground"
                  aria-label="Video call"
                >
                  <Video className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="whatsapp-messages min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
              {bothConnected && messages.length === 0 && !partnerLeftMessage && (
                <div className="space-y-2 pb-2">
                  <div className="flex justify-center">
                    <p className="whatsapp-connected-banner">
                      You and {partnerName ?? "your match"} are connected
                    </p>
                  </div>
                  {icebreaker && (
                    <div className="mx-auto max-w-md rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-center text-xs text-sky-100">
                      Icebreaker: {icebreaker}
                    </div>
                  )}
                </div>
              )}

              {messages.length === 0 && !partnerLeftMessage && !bothConnected ? (
                <div className="flex h-full items-center justify-center px-4">
                  {waitingPreview ? (
                    <div className="whatsapp-waiting-empty">
                      <div className="whatsapp-waiting-empty-rings" aria-hidden>
                        <span />
                        <span />
                        <span />
                      </div>
                      <p className="whatsapp-waiting-empty-title">Your chat is almost ready</p>
                      <p className="whatsapp-waiting-empty-copy">
                        Messages unlock the second a stranger connects.
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-card/80 px-4 py-2 text-center text-sm text-muted shadow-sm">
                      Linking your random match...
                    </p>
                  )}
                </div>
              ) : (
                messages.map((message) =>
                  message.kind === "system" ? (
                    <div key={message.id} className="flex justify-center py-1">
                      <p className="whatsapp-connected-banner text-center text-xs">
                        {message.text}
                      </p>
                    </div>
                  ) : (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-end gap-2",
                      message.isLocal ? "justify-end" : "justify-start",
                    )}
                  >
                    {!message.isLocal && partnerId && (
                      <ChatAvatar
                        userId={partnerId}
                        label={partnerName ?? "Stranger"}
                        size="sm"
                        online={bothConnected}
                        className="mb-0.5 hidden sm:block"
                      />
                    )}

                    <div
                      className={cn(
                        "whatsapp-bubble max-w-[82%] px-3 py-2 shadow-sm",
                        message.isLocal
                          ? "whatsapp-bubble-out rounded-2xl rounded-br-md"
                          : "whatsapp-bubble-in rounded-2xl rounded-bl-md",
                      )}
                    >
                      {message.kind === "image" && message.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={message.imageUrl}
                          alt="Shared"
                          className="max-h-48 rounded-lg object-cover"
                        />
                      ) : (
                        <p className="text-sm leading-relaxed">{message.text}</p>
                      )}
                      {message.reaction && (
                        <span className="mt-1 inline-block text-base">{message.reaction}</span>
                      )}
                      <div
                        className={cn(
                          "mt-1 flex items-center justify-end gap-2 text-[10px]",
                          message.isLocal ? "text-emerald-100/70" : "text-muted",
                        )}
                      >
                        {message.isLocal &&
                          message.readBy &&
                          message.readBy.length > 1 && <span>Seen</span>}
                        <span>{formatTime(message.timestamp)}</span>
                        {!message.isLocal && onReaction && (
                          <button
                            type="button"
                            className="opacity-70 hover:opacity-100"
                            onClick={() => onReaction(message.id, "👍")}
                          >
                            👍
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  ),
                )
              )}

              {partnerLeftMessage && (
                <div className="flex justify-center py-4">
                  <p className="whatsapp-partner-left-notice">
                    {partnerLeftMessage}
                  </p>
                </div>
              )}

              {partnerTyping && !partnerLeftMessage && (
                <div className="flex items-end justify-start gap-2">
                  {partnerId && (
                    <ChatAvatar
                      userId={partnerId}
                      label={partnerName ?? "Stranger"}
                      size="sm"
                      online={bothConnected}
                      className="mb-0.5 hidden sm:block"
                    />
                  )}
                  <div className="whatsapp-typing-bubble">
                    <span className="whatsapp-typing-label">
                      {partnerName ?? "Stranger"} is typing
                    </span>
                    <span className="whatsapp-typing-dots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {sendError && (
              <p className="shrink-0 border-t border-border bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
                {sendError}
              </p>
            )}

            {emojiOpen && onPickEmoji && (
              <div className="border-t border-border bg-card px-3 py-2">
                <EmojiPicker
                  onPick={(emoji) => {
                    onPickEmoji(emoji);
                    setEmojiOpen(false);
                  }}
                />
              </div>
            )}

            <form
              className="whatsapp-input flex shrink-0 items-center gap-2 border-t border-border bg-card px-3 py-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                onSend();
              }}
            >
              <button
                type="button"
                onClick={() => setEmojiOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-lg hover:bg-card-hover"
                aria-label="Emoji"
              >
                😊
              </button>
              {onPickImage && (
                <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-xs hover:bg-card-hover">
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          onPickImage(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
              <Input
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={
                  partnerHasLeft
                    ? "Partner left the chat"
                    : canSend
                      ? "Type a message"
                      : waitingPreview
                        ? "Waiting for your match..."
                        : "Connecting..."
                }
                autoComplete="off"
                disabled={!canSend}
                className="h-11 flex-1 rounded-full border-border bg-card-hover px-4"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!draft.trim() || !canSend || isSending}
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <span className="sr-only">Send</span>
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </Button>
            </form>

            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndChatClick}
                disabled={isLoading}
                className={cn(
                  "gap-1.5 font-black",
                  endChatConfirm
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-200 hover:text-amber-100"
                    : "text-red-300 hover:text-red-200",
                )}
              >
                <PhoneOff className="h-3.5 w-3.5" />
                {endChatConfirm ? "Really?" : "End Chat"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportOpen(true)}
                disabled={!partnerId || partnerHasLeft || isLoading}
                className="gap-1.5 text-amber-300 hover:text-amber-200"
              >
                <Flag className="h-3.5 w-3.5" />
                Report
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setEndChatConfirm(false);
                  onNext();
                }}
                disabled={isLoading}
                className="gap-1.5"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Next
              </Button>
            </footer>

            {upgradeTier && (
              <div className="whatsapp-upgrade-overlay" role="status" aria-live="polite">
                <div
                  className={cn(
                    "whatsapp-upgrade-box",
                    upgradeTier === "pro"
                      ? "whatsapp-upgrade-box-pro"
                      : "whatsapp-upgrade-box-max",
                  )}
                >
                  <p className="whatsapp-upgrade-box-text">
                    {upgradeTier === "pro" ? "UPGRADE TO PRO" : "UPGRADE TO MAX"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        partnerName={partnerName}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReportSubmit}
      />
    </>
  );
}