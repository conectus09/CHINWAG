"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { CaptchaDisplay } from "@/components/captcha-display";
import { Input } from "@/components/ui/input";
import { saveAuthSession } from "@/lib/auth-client";
import { formatCaptchaInput, generateCaptcha, isCaptchaMatch } from "@/lib/captcha";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  notice?: string | null;
}

function FieldLabel({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="auth-field-label">
      {children}
    </label>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="auth-field-icon" aria-hidden>
      {children}
    </span>
  );
}

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
  notice,
}: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshCaptcha = useCallback(() => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
  }, []);

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCaptchaInput("");
    setSubmitting(false);
    setAuthError(null);
    refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    resetForm();
  }, [open, initialMode, resetForm]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);

    if (!isCaptchaMatch(captchaInput, captchaCode)) {
      setAuthError("Invalid captcha. Try again.");
      refreshCaptcha();
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email,
          password,
          name: email.split("@")[0] ?? "User",
          captcha: captchaInput,
          captchaCode,
        }),
      });

      const body = (await response.json()) as {
        session?: import("@/lib/platform-types").AuthSession;
        error?: string;
      };

      if (!response.ok || !body.session) {
        throw new Error(body.error ?? "Authentication failed");
      }

      saveAuthSession(body.session);
      onClose();
      resetForm();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
      refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (tab: AuthMode) => {
    setMode(tab);
    setAuthError(null);
  };

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div
        className="auth-overlay fixed inset-0 z-[300]"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="auth-modal-shell fixed inset-0 z-[310] flex items-center justify-center p-3"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === "login" ? "Login" : "Sign up"}
          className="auth-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="auth-modal-close"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <aside className="auth-modal-side">
            <div className="auth-modal-side-content">
              <div className="auth-modal-header">
                <div className="auth-modal-icon">
                  {mode === "login" ? (
                    <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </div>
                <div>
                  <p className="auth-modal-eyebrow">
                    {mode === "login" ? "Welcome back" : "Join Chinwag"}
                  </p>
                  <h2 className="auth-modal-title">
                    {mode === "login" ? "Login" : "Sign up"}
                  </h2>
                  <p className="auth-modal-subtitle">
                    {mode === "login"
                      ? "Continue chatting."
                      : "Start meeting people."}
                  </p>
                </div>
              </div>

              {notice && (
                <p className="auth-alert auth-alert-notice">{notice}</p>
              )}

              <div
                className="auth-tab-track"
                data-active={mode}
                role="tablist"
                aria-label="Authentication mode"
              >
                <span className="auth-tab-slider" aria-hidden />
                {(["login", "signup"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab}
                    onClick={() => switchMode(tab)}
                    className={cn("auth-tab", mode === tab && "auth-tab-active")}
                  >
                    {tab === "login" ? "Login" : "Sign Up"}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="auth-modal-form-panel">
            <form onSubmit={handleSubmit} className="auth-form">
              {authError && (
                <p className="auth-alert auth-alert-error" role="alert">
                  {authError}
                </p>
              )}
              <div className="auth-field-group">
                <FieldLabel htmlFor="auth-email">Email</FieldLabel>
                <div className="auth-field-wrap">
                  <FieldIcon>
                    <Mail className="h-3 w-3" />
                  </FieldIcon>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    className="auth-field focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <FieldLabel htmlFor="auth-password">Password</FieldLabel>
                <div className="auth-field-wrap">
                  <FieldIcon>
                    <Lock className="h-3 w-3" />
                  </FieldIcon>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className="auth-field focus-visible:ring-0"
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div className="auth-field-group auth-field-group-enter">
                  <FieldLabel htmlFor="auth-confirm-password">Confirm</FieldLabel>
                  <div className="auth-field-wrap">
                    <FieldIcon>
                      <ShieldCheck className="h-3 w-3" />
                    </FieldIcon>
                    <Input
                      id="auth-confirm-password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      className="auth-field focus-visible:ring-0"
                    />
                  </div>
                </div>
              )}

              <div className="auth-field-group">
                <FieldLabel htmlFor="auth-captcha">Captcha</FieldLabel>
                <CaptchaDisplay code={captchaCode} onRefresh={refreshCaptcha} />
                <div className="auth-field-wrap">
                  <FieldIcon>
                    <KeyRound className="h-3 w-3" />
                  </FieldIcon>
                  <Input
                    id="auth-captcha"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={captchaInput}
                    onChange={(event) =>
                      setCaptchaInput(formatCaptchaInput(event.target.value))
                    }
                    autoComplete="off"
                    spellCheck={false}
                    className="auth-field auth-field-captcha focus-visible:ring-0"
                  />
                </div>
                <p className="auth-field-hint">8 chars · XXXX-XXXX</p>
              </div>

              <button
                type="submit"
                className={cn("auth-submit-btn", submitting && "auth-submit-btn-wip")}
                disabled={submitting}
              >
                <span>{submitting ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}