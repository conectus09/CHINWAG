"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Play, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatchPreferencesPanel } from "@/components/match-preferences-panel";
import { DEFAULT_PREFERENCES } from "@/lib/platform-types";
import type { MatchPreferences } from "@/lib/platform-types";
import { getUserProfile, setUserProfile } from "@/lib/user-profile";
import { cn } from "@/lib/utils";

interface StartGateModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  allowClose?: boolean;
}

function FieldLabel({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="start-gate-label">
      <span className="start-gate-label-text">{children}</span>
    </label>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="start-gate-field-icon" aria-hidden>
      {children}
    </span>
  );
}

export function StartGateModal({
  open,
  onClose,
  onComplete,
  allowClose = true,
}: StartGateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [preferences, setPreferences] = useState<MatchPreferences>({
    ...DEFAULT_PREFERENCES,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const saved = getUserProfile();
    if (saved) {
      setName(saved.name);
      setAge(String(saved.age));
      setIsAdultConfirmed(saved.isAdultConfirmed);
      setPreferences(saved.preferences ?? { ...DEFAULT_PREFERENCES });
    } else {
      setName("");
      setAge("");
      setIsAdultConfirmed(false);
    }
    setError(null);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && allowClose) onClose();
    };

    document.body.style.overflow = "hidden";
    document.body.classList.add("start-gate-open");
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("start-gate-open");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [allowClose, onClose, open]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const parsedAge = Number(age);

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }

    if (!age || Number.isNaN(parsedAge)) {
      setError("Please enter your age.");
      return;
    }

    if (parsedAge < 18) {
      setError("You must be 18 or older to use Chinwag.");
      return;
    }

    if (!isAdultConfirmed) {
      setError("Please confirm that you are 18 years or older.");
      return;
    }

    setUserProfile({
      name: trimmedName,
      age: parsedAge,
      isAdultConfirmed: true,
      preferences,
    });

    onComplete();
  };

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div
        className="start-gate-overlay"
        onClick={allowClose ? onClose : undefined}
        aria-hidden
      />

      <div className="start-gate-shell">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Start chatting setup"
          className="start-gate-modal"
          onClick={(event) => event.stopPropagation()}
        >
          {allowClose && (
            <button
              type="button"
              onClick={onClose}
              className="start-gate-close"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <form onSubmit={handleSubmit} className="start-gate-form">
            <div className="start-gate-fields-row">
              <div className="start-gate-field-group">
                <FieldLabel htmlFor="start-name">Name</FieldLabel>
                <div className="start-gate-field-wrap">
                  <FieldIcon>
                    <UserRound className="h-3.5 w-3.5" />
                  </FieldIcon>
                  <Input
                    id="start-name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="nickname"
                    className="start-gate-field"
                  />
                </div>
              </div>

              <div className="start-gate-field-group start-gate-field-group-age">
                <FieldLabel htmlFor="start-age">Age</FieldLabel>
                <div className="start-gate-field-wrap">
                  <Input
                    id="start-age"
                    type="number"
                    min={18}
                    max={99}
                    placeholder="18+"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    className="start-gate-field start-gate-field-age"
                  />
                </div>
              </div>
            </div>

            <label
              className={cn(
                "start-gate-check",
                isAdultConfirmed && "start-gate-check-active",
              )}
            >
              <input
                type="checkbox"
                checked={isAdultConfirmed}
                onChange={(event) => setIsAdultConfirmed(event.target.checked)}
                className="start-gate-checkbox"
              />
              <span className="start-gate-check-text">
                I confirm that I am{" "}
                <strong>18 years or older</strong> and agree to chat responsibly.
              </span>
            </label>

            <div className="start-gate-prefs">
              <p className="start-gate-label-text mb-2">Match preferences</p>
              <MatchPreferencesPanel
                value={preferences}
                onChange={setPreferences}
                compact
              />
            </div>

            {error && <p className="start-gate-error">{error}</p>}

            <Button type="submit" className="start-gate-submit w-full gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Start Chatting
            </Button>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}