"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

let sharedSocket: Socket | null = null;

export function getPresenceSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
    });
  }
  return sharedSocket;
}

/** Connect early (e.g. when user opens the start gate) so the live counter works immediately */
export function connectPresenceSocket(): void {
  const socket = getPresenceSocket();
  if (!socket.connected) {
    socket.connect();
  }
}