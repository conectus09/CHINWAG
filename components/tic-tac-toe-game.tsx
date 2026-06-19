"use client";

import { useCallback, useEffect, useState } from "react";
import type { TicTacToeState } from "@/lib/platform-types";
import { cn } from "@/lib/utils";

interface TicTacToeGameProps {
  roomId: string;
  myMark: "X" | "O";
}

export function TicTacToeGame({ roomId, myMark }: TicTacToeGameProps) {
  const [state, setState] = useState<TicTacToeState | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/games?roomId=${encodeURIComponent(roomId)}`);
    if (!response.ok) return;
    const data = (await response.json()) as { state: TicTacToeState };
    setState(data.state);
  }, [roomId]);

  const play = useCallback(
    async (index: number) => {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, action: "move", index, mark: myMark }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { state: TicTacToeState };
      setState(data.state);
    },
    [myMark, roomId],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!state) return null;

  return (
    <div className="rounded-xl border border-border bg-card/80 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>
          You: {myMark} · Score {state.scores[myMark]}–{state.scores[myMark === "X" ? "O" : "X"]}
        </span>
        <button
          type="button"
          className="text-sky-300 hover:text-sky-200"
          onClick={() =>
            void fetch("/api/games", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomId, action: "reset" }),
            }).then(() => load())
          }
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {state.board.map((cell, index) => (
          <button
            key={index}
            type="button"
            disabled={Boolean(cell) || state.turn !== myMark || Boolean(state.winner)}
            onClick={() => void play(index)}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg border border-border bg-card-hover text-lg font-bold",
              cell === "X" && "text-sky-300",
              cell === "O" && "text-amber-300",
            )}
          >
            {cell ?? ""}
          </button>
        ))}
      </div>
      {state.winner && (
        <p className="mt-2 text-center text-xs text-emerald-300">
          {state.winner === "draw" ? "Draw!" : `${state.winner} wins`}
        </p>
      )}
    </div>
  );
}