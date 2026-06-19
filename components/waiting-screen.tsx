"use client";

import { Radio, Users, X } from "lucide-react";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { GuestWaitingExtras } from "@/components/guest-waiting-extras";
import { LiveOnlineCounter } from "@/components/live-online-counter";
import { useAuth } from "@/hooks/use-auth";

interface WaitingScreenProps {
  onCancel: () => void;
  isLoading?: boolean;
  queuePosition?: number | null;
  queueAhead?: number | null;
  estimatedWaitSec?: number | null;
  waitingOnline?: number | null;
}

export function WaitingScreen({
  onCancel,
  isLoading,
  queuePosition,
  queueAhead,
  estimatedWaitSec,
  waitingOnline,
}: WaitingScreenProps) {
  const { isLoggedIn } = useAuth();
  const othersWaiting = Math.max(0, (waitingOnline ?? 1) - 1);

  return (
    <div className="stranger-waiting">
      <div className="stranger-waiting-card">
        <div className="stranger-waiting-accent" aria-hidden />

        <div className="stranger-waiting-badge">
          <Users className="h-3.5 w-3.5" />
          Waiting room
        </div>

        <div className="stranger-waiting-visual" aria-hidden>
          <div className="stranger-waiting-glow" />
          <div className="stranger-waiting-orbit">
            <span className="stranger-waiting-ring stranger-waiting-ring-1" />
            <span className="stranger-waiting-ring stranger-waiting-ring-2" />
            <span className="stranger-waiting-ring stranger-waiting-ring-3" />
            <span className="stranger-waiting-sweep" />
            <span className="stranger-waiting-node stranger-waiting-node-a" />
            <span className="stranger-waiting-node stranger-waiting-node-b" />
            <div className="stranger-waiting-core">
              <Radio className="h-6 w-6" strokeWidth={2} />
            </div>
          </div>
        </div>

        <h2 className="stranger-waiting-title">
          {othersWaiting > 0 ? "Someone is joining" : "Waiting for a stranger"}
          <span className="stranger-waiting-ellipsis" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </h2>

        <p className="stranger-waiting-sub">
          {othersWaiting > 0
            ? `${othersWaiting + 1} people in the waiting room — connecting you now`
            : "You're first in line. When another person joins, you'll match instantly."}
        </p>

        {queuePosition != null && queuePosition > 0 && (
          <p className="stranger-waiting-queue text-center text-sm text-muted">
            Queue #{queuePosition}
            {queueAhead != null && queueAhead > 0
              ? ` · ${queueAhead} ahead`
              : " · you're next"}
          </p>
        )}

        <div className="flex justify-center py-2">
          <LiveOnlineCounter />
        </div>

        {!isLoggedIn && (
          <ClientErrorBoundary label="guest-waiting-extras">
            <GuestWaitingExtras
              queueAhead={queueAhead}
              estimatedWaitSec={estimatedWaitSec}
            />
          </ClientErrorBoundary>
        )}

        <div className="stranger-waiting-progress" aria-hidden>
          <span className="stranger-waiting-progress-bar" />
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="stranger-waiting-cancel"
        >
          <X className="h-3.5 w-3.5" />
          Leave waiting room
        </button>
      </div>
    </div>
  );
}