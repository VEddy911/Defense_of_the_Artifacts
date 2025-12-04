// packages/server/index.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

// socket.id - { x, y, z, ry } - for tracking position and rotation of player
const players = new Map();

io.on("connection", (socket) => {
  console.log("[server] Player connected:", socket.id);

  // add default state for this player
  players.set(socket.id, { x: 0, y: 2, z: 0, ry: 0 });

  // receive player state from a client
  socket.on("playerState", (state) => {
    const current = players.get(socket.id);
    if (!current) return;

    players.set(socket.id, {
      x: state.x ?? current.x,
      y: state.y ?? current.y,
      z: state.z ?? current.z,
      ry: state.ry ?? current.ry,
    });
  });

  socket.on("chat:message", (payload) => {
    const text = (payload?.text ?? "").toString().trim();
    if (!text) return;
    const clipped = text.slice(0, 240);
    io.emit("chat:message", { id: socket.id, text: clipped });
  });

  socket.on("disconnect", () => {
    console.log("[server] Player disconnected:", socket.id);
    players.delete(socket.id); // remove from map so no ghost player
  });
});

// broadcast world state around 20 times per second - latency test in future
setInterval(() => {
  const payload = [];
  for (const [id, s] of players.entries()) {
    payload.push({ id, ...s });
  }
  io.emit("worldState", { players: payload });
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("[server] listening on", PORT));
