"use client";

import { io } from "socket.io-client";

let socket;

const socketBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

export const getSocket = () => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("bm_token");
  if (!token) return null;

  if (!socket) {
    socket = io(socketBaseUrl(), {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
