"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Play, Shield, Sparkles } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { ChatRoom } from "@/components/chat-room";
import { GuestPerksCard } from "@/components/guest-perks-card";
import { GuestSessionBadge } from "@/components/guest-session-badge";
import { LiveOnlineCounter } from "@/components/live-online-counter";
import { StartGateModal } from "@/components/start-gate-modal";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { WaitingScreen } from "@/components/waiting-screen";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMatch } from "@/hooks/use-match";
import { useUserId } from "@/hooks/use-user-id";
import { hasCompletedStartGate } from "@/lib/user-profile";

export default function ChatPage() {
  const router = useRouter();
  const userId = useUserId();
  const { isLoggedIn } = useAuth();
  const [gatePassed, setGatePassed] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (hasCompletedStartGate()) {
      setGatePassed(true);
    } else {
      setGateOpen(true);
    }
  }, []);

  const {
    phase,
    roomId,
    partnerId,
    partnerName,
    partnerAge,
    queuePosition,
    queueAhead,
    estimatedWaitSec,
    guestRemaining,
    commonInterests,
    icebreaker,
    error,
    isLoading,
    joinQueue,
    findNext,
    cancel,
  } = useMatch({ userId, autoStart: gatePassed });

  const handleCancel = useCallback(async () => {
    await cancel();
    router.push("/");
  }, [cancel, router]);

  const handleEnd = useCallback(async () => {
    await findNext();
  }, [findNext]);

  const handleGateComplete = useCallback(() => {
    setGateOpen(false);
    setGatePassed(true);
  }, []);

  if (!userId) {
    return (
      <div className="stranger-chat-page stranger-chat-loading">
        <div className="stranger-chat-glow stranger-chat-glow-a" aria-hidden />
        <div className="stranger-chat-glow stranger-chat-glow-b" aria-hidden />
        <div className="stranger-chat-spinner" role="status" aria-label="Loading" />
      </div>
    );
  }

  return (
    <>
      <StartGateModal
        open={gateOpen}
        onClose={() => router.push("/")}
        onComplete={handleGateComplete}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        notice={
          guestRemaining === 0
            ? "Daily guest limit reached. Login for unlimited matches."
            : null
        }
      />

      {(phase === "matched" || phase === "partner_left") && roomId ? (
        <div className="fixed inset-0 z-40 flex flex-col">
          <ChatRoom
            key={roomId}
            roomId={roomId}
            userId={userId}
            partnerId={partnerId}
            partnerName={partnerName}
            partnerAge={partnerAge}
            icebreaker={icebreaker}
            commonInterests={commonInterests}
            partnerLeft={phase === "partner_left"}
            onNext={() => void findNext()}
            onEnd={() => void handleEnd()}
            onBack={() => {
              void cancel().then(() => router.push("/"));
            }}
          />
        </div>
      ) : (
        <main className="stranger-chat-page">
          <div className="stranger-chat-glow stranger-chat-glow-a" aria-hidden />
          <div className="stranger-chat-glow stranger-chat-glow-b" aria-hidden />
          <div className="stranger-chat-grid" aria-hidden />

          <div className="stranger-chat-shell">
            <header className="stranger-chat-header">
              <div className="stranger-chat-header-back">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="stranger-chat-back gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="stranger-chat-back-label">Back</span>
                  </Button>
                </Link>
              </div>

              <div className="stranger-chat-header-center">
                <GuestSessionBadge />
                <LiveOnlineCounter className="stranger-chat-header-live" />
              </div>

              <div className="stranger-chat-header-theme">
                <ThemeSwitcher variant="header" />
              </div>
            </header>

            {error && (
              <div className="stranger-chat-error" role="alert">
                {error}
              </div>
            )}

            {phase === "waiting" && (
              <WaitingScreen
                onCancel={() => void handleCancel()}
                isLoading={isLoading}
                queuePosition={queuePosition}
                queueAhead={queueAhead}
                estimatedWaitSec={estimatedWaitSec}
              />
            )}

            {phase === "idle" && !isLoading && gatePassed && guestRemaining !== 0 && (
              <div className="stranger-lobby">
                <div className="stranger-lobby-card">
                  <div className="stranger-lobby-badge">
                    <Sparkles className="h-3.5 w-3.5" />
                    Guest mode · no login
                  </div>

                  <h1 className="stranger-lobby-title">Ready for a random chinwag?</h1>
                  <p className="stranger-lobby-copy">
                    Tap below to match with someone online right now. Video, voice, or
                    text — your choice once connected.
                  </p>

                  <div className="stranger-lobby-features">
                    <div className="stranger-lobby-feature">
                      <MessageCircle className="h-4 w-4" />
                      <span>Anonymous matching</span>
                    </div>
                    <div className="stranger-lobby-feature">
                      <Shield className="h-4 w-4" />
                      <span>18+ only</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => void joinQueue()}
                    size="lg"
                    className="stranger-lobby-cta w-full gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Find a stranger
                  </Button>

                  <p className="stranger-lobby-footnote">
                    By continuing you agree to chat respectfully. Misuse can be reported.
                  </p>

                  {!isLoggedIn && (
                    <div className="stranger-lobby-guest-perks">
                      <GuestPerksCard
                        compact
                        onLogin={() => setAuthOpen(true)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {phase === "idle" && guestRemaining === 0 && !isLoggedIn && (
              <div className="stranger-lobby">
                <div className="stranger-lobby-card">
                  <h2 className="stranger-lobby-title">Daily limit reached</h2>
                  <p className="stranger-lobby-copy">
                    You&apos;ve used all 30 guest matches for today. Login for unlimited
                    matching — it&apos;s free.
                  </p>
                  <Button
                    onClick={() => setAuthOpen(true)}
                    size="lg"
                    className="stranger-lobby-cta w-full"
                  >
                    Login / Sign up
                  </Button>
                </div>
              </div>
            )}

            {phase === "partner_left" && (
              <div className="stranger-lobby">
                <div className="stranger-lobby-card stranger-lobby-card-compact">
                  <div className="stranger-chat-spinner stranger-chat-spinner-sm" />
                  <h2 className="stranger-lobby-title">Your partner left</h2>
                  <p className="stranger-lobby-copy">Finding someone new for you...</p>
                </div>
              </div>
            )}
          </div>
        </main>
      )}
    </>
  );
}