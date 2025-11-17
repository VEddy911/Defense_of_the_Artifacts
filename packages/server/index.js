// packages/server/index.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("[server] client connected:", socket.id);

  socket.on("hello", (data) => {
    console.log("[server] hello from", socket.id, data);
    socket.emit("server-ping", { time: Date.now() });
  });

  socket.on("disconnect", () => {
    console.log("[server] client disconnected:", socket.id);
  });
});

// simple health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});