"use client";

import { io, type Socket } from "socket.io-client";

function resolveSocketUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3001`;
    }
  }

  return null;
}

let sharedSocket: Socket | null = null;

export function isPresenceSocketConfigured(): boolean {
  return resolveSocketUrl() !== null;
}

export function getPresenceSocket(): Socket | null {
  const url = resolveSocketUrl();
  if (!url) return null;

  if (!sharedSocket) {
    sharedSocket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
    });
  }
  return sharedSocket;
}

/** Connect early (e.g. when user opens the start gate) so the live counter works immediately */
export function connectPresenceSocket(): void {
  const socket = getPresenceSocket();
  if (socket && !socket.connected) {
    socket.connect();
  }
}