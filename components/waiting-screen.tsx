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
}

export function WaitingScreen({
  onCancel,
  isLoading,
  queueAhead,
  estimatedWaitSec,
}: WaitingScreenProps) {
  const { isLoggedIn } = useAuth();

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
          Waiting for a stranger
          <span className="stranger-waiting-ellipsis" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </h2>

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