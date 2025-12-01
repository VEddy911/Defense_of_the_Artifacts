// packages/client/src/main.ts
import "./style.css";

// import creates and starts the babylon app
import "./app";

import { io } from "socket.io-client";

// If you still have a #app div in index.html you can optionally clear it or use it for UI overlays
const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  root.innerHTML = "";
}

// connect to our Node/Socket.IO server
const socket = io("http://localhost:3000");

// when connected
socket.on("connect", () => {
  console.log("[client] connected to server with id:", socket.id);
  socket.emit("hello", { msg: "hi from client" });
});

// when we get a ping back
socket.on("server-ping", (data) => {
  console.log("[client] server-ping:", data);
});

// when disconnected
socket.on("disconnect", () => {
  console.log("[client] disconnected from server");
});
