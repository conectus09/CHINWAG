"use client";

import { useEffect } from "react";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CHINWAG /chat]", error);
  }, [error]);

  return (
    <main className="stranger-chat-page">
      <div className="stranger-lobby">
        <div className="stranger-lobby-card">
          <h2 className="stranger-lobby-title">Chat failed to load</h2>
          <p className="stranger-lobby-copy">
            Something crashed while opening chat. Reload to try again.
          </p>
          <button
            type="button"
            className="guest-waiting-action"
            style={{ margin: "0 auto", display: "inline-flex" }}
            onClick={() => reset()}
          >
            Reload chat
          </button>
          <a
            href="/"
            className="guest-waiting-action"
            style={{ margin: "0.5rem auto 0", display: "inline-flex", textDecoration: "none" }}
          >
            Back home
          </a>
        </div>
      </div>
    </main>
  );
}