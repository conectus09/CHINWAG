import { REDIS_KEYS } from "./constants";
import { getRedis } from "./redis";
import type { TicTacToeState } from "./platform-types";

declare global {
  // eslint-disable-next-line no-var
  var chinwagGameStore: Map<string, TicTacToeState> | undefined;
}

const gameStore = global.chinwagGameStore ?? (global.chinwagGameStore = new Map());

function emptyBoard(): TicTacToeState {
  return {
    board: Array(9).fill(null),
    turn: "X",
    scores: { X: 0, O: 0 },
    winner: null,
    updatedAt: Date.now(),
  };
}

function checkWinner(board: TicTacToeState["board"]): "X" | "O" | "draw" | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

async function saveGame(roomId: string, state: TicTacToeState): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEYS.game(roomId), JSON.stringify(state), "EX", 3600);
    return;
  }
  gameStore.set(roomId, state);
}

export async function getTicTacToe(roomId: string): Promise<TicTacToeState> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(REDIS_KEYS.game(roomId));
    if (!raw) return emptyBoard();
    return JSON.parse(raw) as TicTacToeState;
  }
  return gameStore.get(roomId) ?? emptyBoard();
}

export async function playTicTacToe(
  roomId: string,
  index: number,
  mark: "X" | "O",
): Promise<TicTacToeState> {
  const state = await getTicTacToe(roomId);
  if (state.winner || state.board[index] !== null || state.turn !== mark) {
    return state;
  }

  state.board[index] = mark;
  state.updatedAt = Date.now();
  const winner = checkWinner(state.board);
  state.winner = winner;

  if (winner === "X" || winner === "O") {
    state.scores[winner] += 1;
    state.turn = winner === "X" ? "O" : "X";
  } else if (winner === "draw") {
    state.turn = state.turn === "X" ? "O" : "X";
  } else {
    state.turn = mark === "X" ? "O" : "X";
  }

  await saveGame(roomId, state);
  return state;
}

export async function resetTicTacToe(roomId: string): Promise<TicTacToeState> {
  const current = await getTicTacToe(roomId);
  const next = emptyBoard();
  next.scores = { ...current.scores };
  await saveGame(roomId, next);
  return next;
}