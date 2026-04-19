import { Server } from "socket.io";
import {
  authenticateSocketUser,
  communityRoom,
  ensureCommunityAccess,
} from "../services/communityChat.service.js";

let io;

export const initIO = (server, allowedOrigins = []) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error("CORS blocked"));
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");
      socket.data.user = await authenticateSocketUser(token);
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    socket.on("community:join", async ({ landlordId } = {}, callback) => {
      try {
        const access = await ensureCommunityAccess({
          user: socket.data.user,
          landlordId,
        });

        if (!access.ok) {
          callback?.({ ok: false, message: access.message, status: access.status });
          return;
        }

        if (socket.data.communityRoom) {
          socket.leave(socket.data.communityRoom);
        }

        socket.data.communityRoom = communityRoom(access.landlordId);
        socket.data.communityLandlordId = String(access.landlordId);
        socket.join(socket.data.communityRoom);

        callback?.({ ok: true, landlordId: String(access.landlordId) });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Join failed" });
      }
    });

    socket.on("community:leave", () => {
      if (socket.data.communityRoom) {
        socket.leave(socket.data.communityRoom);
        socket.data.communityRoom = null;
        socket.data.communityLandlordId = null;
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }
  return io;
};
