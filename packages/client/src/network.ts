// packages/client/src/network.ts
import { io, Socket } from "socket.io-client";

export const socket: Socket = io("http://localhost:3000", {
  autoConnect: true,
});

socket.on("connect", () => {
  console.log("[client] connected, id =", socket.id);
});

socket.on("disconnect", () => {
  console.log("[client] disconnected");
});