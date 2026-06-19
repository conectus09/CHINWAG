"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CHINWAG]", error);
  }, [error]);

  return (
    <main className="stranger-chat-page stranger-chat-loading">
      <div className="stranger-chat-shell" style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h1 className="stranger-lobby-title" style={{ marginBottom: "0.75rem" }}>
          Something went wrong
        </h1>
        <p className="stranger-lobby-copy" style={{ marginBottom: "1.5rem" }}>
          The page hit an error. Reload to try again.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            type="button"
            className="guest-waiting-action"
            onClick={() => reset()}
          >
            Reload
          </button>
          <a href="/" className="guest-waiting-action" style={{ textDecoration: "none" }}>
            Back home
          </a>
        </div>
      </div>
    </main>
  );
}