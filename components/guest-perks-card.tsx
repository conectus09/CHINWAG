"use client";

import { Crown, LogIn, Shield, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuestSession } from "@/hooks/use-guest-session";

interface GuestPerksCardProps {
  onLogin?: () => void;
  compact?: boolean;
}

const GUEST_FEATURES = [
  "Anonymous random text chat",
  "Voice & video calls",
  "Emoji & photos",
  "Report & safety filter",
];

const LOGIN_UNLOCKS = [
  "Unlimited daily matches",
  "Saved profile & history",
  "Priority matching queue",
  "Pro filters & badges",
];

export function GuestPerksCard({ onLogin, compact = false }: GuestPerksCardProps) {
  const { matchesToday, dailyLimit, remaining, sessionMinutes } = useGuestSession();

  return (
    <div className={compact ? "guest-perks guest-perks-compact" : "guest-perks"}>
      <div className="guest-perks-header">
        <Sparkles className="h-4 w-4 text-sky-300" />
        <div>
          <p className="guest-perks-eyebrow">Guest mode · no login needed</p>
          <p className="guest-perks-sub">
            {matchesToday}/{dailyLimit} matches today · {sessionMinutes} min session
            {remaining <= 5 && remaining > 0 && (
              <span className="text-amber-300"> · {remaining} left</span>
            )}
          </p>
        </div>
      </div>

      <div className="guest-perks-grid">
        <div>
          <p className="guest-perks-col-title">
            <Zap className="inline h-3.5 w-3.5" /> Free right now
          </p>
          <ul className="guest-perks-list">
            {GUEST_FEATURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {!compact && (
          <div>
            <p className="guest-perks-col-title">
              <Crown className="inline h-3.5 w-3.5" /> Login unlocks
            </p>
            <ul className="guest-perks-list guest-perks-list-muted">
              {LOGIN_UNLOCKS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="guest-perks-safety">
        <Shield className="inline h-3.5 w-3.5" />
        Never share passwords, OTP, or payment details in chat.
      </p>

      {onLogin && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="guest-perks-login w-full gap-2"
          onClick={onLogin}
        >
          <LogIn className="h-3.5 w-3.5" />
          Login for unlimited matches
        </Button>
      )}
    </div>
  );
}