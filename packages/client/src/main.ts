// packages/client/src/main.ts
import "./style.css";
import { io } from "socket.io-client";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div style="color: white; font-family: sans-serif; text-align: center; margin-top: 40px;">
    <h1>Defense of the Artifacts</h1>
    <p>Check the browser console for Socket.IO logs.</p>
  </div>
`;

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
