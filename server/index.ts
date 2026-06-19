/**
 * CHINWAG real-time server
 * Express + Socket.io + Redis adapter for scalable live online counter.
 *
 * Run: npm run dev:socket  (or npm run dev for Next.js + socket together)
 */

import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import {
  addOnlineUser,
  closeRedisClients,
  getOnlineCount,
  initRedisClients,
  removeOnlineUser,
  shouldBroadcastCount,
} from "./online-presence";

const PORT = Number(process.env.SOCKET_PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

async function main() {
  const app = express();
  const httpServer = createServer(app);

  app.use(
    cors({
      origin: CLIENT_ORIGIN.split(",").map((value) => value.trim()),
      credentials: true,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "chinwag-socket" });
  });

  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_ORIGIN.split(",").map((value) => value.trim()),
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  const { pub, sub } = await initRedisClients();
  if (pub && sub) {
    io.adapter(createAdapter(pub, sub));
    console.log("[socket] Redis adapter enabled — multi-instance ready");
  }

  /** Broadcast count to every connected client only when it changed */
  async function emitOnlineCountIfChanged(): Promise<void> {
    const count = await getOnlineCount();
    if (!(await shouldBroadcastCount(count))) return;
    io.emit("online_count", count);
  }

  io.on("connection", async (socket) => {
    await addOnlineUser(socket.id);
    await emitOnlineCountIfChanged();

    // Send current count immediately to the new client
    socket.emit("online_count", await getOnlineCount());

    socket.on("disconnect", async () => {
      await removeOnlineUser(socket.id);
      await emitOnlineCountIfChanged();
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`[socket] CHINWAG real-time server on http://localhost:${PORT}`);
    console.log(`[socket] Allowed origin: ${CLIENT_ORIGIN}`);
  });

  const shutdown = async () => {
    console.log("[socket] Shutting down...");
    io.close();
    httpServer.close();
    await closeRedisClients();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error("[socket] Failed to start:", error);
  process.exit(1);
});