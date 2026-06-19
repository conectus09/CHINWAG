"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REPORT_REASONS = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "spam", label: "Spam or scam" },
  { id: "underage", label: "Underage user" },
  { id: "other", label: "Other" },
] as const;

interface ReportModalProps {
  open: boolean;
  partnerName?: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export function ReportModal({
  open,
  partnerName,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setSelected(null);
    setDetails("");
    setError(null);
    setSuccess(false);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isSubmitting, onClose, open]);

  const handleSubmit = async () => {
    if (!selected) {
      setError("Please select a reason.");
      return;
    }

    const reason =
      selected === "other"
        ? details.trim() || "Other"
        : (REPORT_REASONS.find((entry) => entry.id === selected)?.label ??
          selected);

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(reason);
      setSuccess(true);
      window.setTimeout(() => onClose(), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div
        className="report-modal-overlay"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden
      />

      <div className="report-modal-shell">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Report user"
          className="report-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="report-modal-close"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="report-modal-icon">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h2 className="report-modal-title">Report {partnerName ?? "user"}</h2>
          <p className="report-modal-copy">
            Tell us what happened. We review every report and may end the chat or
            ban repeat offenders.
          </p>

          {success ? (
            <p className="report-modal-success" role="status">
              Report submitted. Thank you for keeping Chinwag safe.
            </p>
          ) : (
            <>
              <div className="report-modal-reasons">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setSelected(reason.id)}
                    className={cn(
                      "report-modal-reason",
                      selected === reason.id && "report-modal-reason-active",
                    )}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>

              {selected === "other" && (
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Add details (optional)"
                  rows={3}
                  className="report-modal-details"
                  disabled={isSubmitting}
                />
              )}

              {error && (
                <p className="report-modal-error" role="alert">
                  {error}
                </p>
              )}

              <div className="report-modal-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting}
                  className="report-modal-submit"
                >
                  {isSubmitting ? "Sending..." : "Submit report"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}