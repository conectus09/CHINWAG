"use client";

import { Radio, Users, X } from "lucide-react";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { GuestWaitingExtras } from "@/components/guest-waiting-extras";
import { useAuth } from "@/hooks/use-auth";

interface WaitingScreenProps {
  onCancel: () => void;
  isLoading?: boolean;
  queueAhead?: number | null;
  estimatedWaitSec?: number | null;
  variant?: "full" | "dock";
}

function WaitingRadar({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? "stranger-waiting-visual stranger-waiting-visual-compact" : "stranger-waiting-visual"}
      aria-hidden
    >
      <div className="stranger-waiting-glow" />
      <div className="stranger-waiting-orbit">
        <span className="stranger-waiting-ring stranger-waiting-ring-1" />
        <span className="stranger-waiting-ring stranger-waiting-ring-2" />
        <span className="stranger-waiting-ring stranger-waiting-ring-3" />
        <span className="stranger-waiting-sweep" />
        <span className="stranger-waiting-node stranger-waiting-node-a" />
        <span className="stranger-waiting-node stranger-waiting-node-b" />
        <div className="stranger-waiting-core">
          <Radio className={compact ? "h-4 w-4" : "h-6 w-6"} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

export function WaitingScreen({
  onCancel,
  isLoading,
  queueAhead,
  estimatedWaitSec,
  variant = "full",
}: WaitingScreenProps) {
  const { isLoggedIn } = useAuth();
  const isDocked = variant === "dock";

  if (isDocked) {
    return (
      <div className="stranger-waiting stranger-waiting-dock">
        <div className="stranger-waiting-card stranger-waiting-card-dock">
          <div className="stranger-waiting-accent" aria-hidden />

          <div className="stranger-waiting-dock-main">
            <WaitingRadar compact />

            <div className="stranger-waiting-dock-copy">
              <div className="stranger-waiting-badge stranger-waiting-badge-dock">
                <Users className="h-3 w-3" />
                Matching
              </div>

              <h2 className="stranger-waiting-title stranger-waiting-title-dock">
                Finding your stranger
                <span className="stranger-waiting-ellipsis" aria-hidden>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </h2>

              <p className="stranger-waiting-dock-sub">
                Hang tight — chat unlocks as soon as someone joins.
              </p>

              <div className="stranger-waiting-progress stranger-waiting-progress-dock" aria-hidden>
                <span className="stranger-waiting-progress-bar" />
              </div>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="stranger-waiting-cancel stranger-waiting-cancel-dock"
              aria-label="Leave waiting room"
            >
              <X className="h-4 w-4" />
              <span className="stranger-waiting-cancel-label">Leave</span>
            </button>
          </div>

          {!isLoggedIn && (
            <ClientErrorBoundary label="guest-waiting-extras">
              <GuestWaitingExtras
                compact
                queueAhead={queueAhead}
                estimatedWaitSec={estimatedWaitSec}
              />
            </ClientErrorBoundary>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stranger-waiting">
      <div className="stranger-waiting-card">
        <div className="stranger-waiting-accent" aria-hidden />

        <div className="stranger-waiting-badge">
          <Users className="h-3.5 w-3.5" />
          Waiting room
        </div>

        <WaitingRadar />

        <h2 className="stranger-waiting-title">
          Waiting for a stranger
          <span className="stranger-waiting-ellipsis" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </h2>

        <p className="stranger-waiting-sub">
          We&apos;ll drop you into chat the moment a match is ready.
        </p>

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