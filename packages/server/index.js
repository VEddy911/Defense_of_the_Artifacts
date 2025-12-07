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

const WEAPONS = {
  rifle: { damage: 20, range: 120, rpm: 600, cone: 10, falloffStart: 60, falloffEnd: 140 },
  pistol: { damage: 28, range: 90, rpm: 300, cone: 12, falloffStart: 40, falloffEnd: 110 },
  melee: { damage: 50, range: 3.5, rpm: 80, cone: 45, falloffStart: 0, falloffEnd: 0 },
};

// socket.id - { x, y, z, ry } - for tracking position and rotation of player
const players = new Map();
const history = new Map(); // socket.id -> array of {t,x,y,z}
const lastFireAt = new Map();
const buckets = new Map(); // token bucket for spam limiting

io.on("connection", (socket) => {
  console.log("[server] Player connected:", socket.id);

  // add default state for this player
  players.set(socket.id, { x: 0, y: 2, z: 0, ry: 0, hp: 100 });

  // receive player state from a client
  socket.on("playerState", (state) => {
    const current = players.get(socket.id);
    if (!current) return;

    players.set(socket.id, {
      x: state.x ?? current.x,
      y: state.y ?? current.y,
      z: state.z ?? current.z,
      ry: state.ry ?? current.ry,
      hp: current.hp ?? 100,
    });

    // track history for lag comp (keep last ~500ms)
    const now = Date.now();
    const list = history.get(socket.id) || [];
    list.push({ t: now, x: state.x ?? current.x, y: state.y ?? current.y, z: state.z ?? current.z });
    while (list.length > 0 && now - list[0].t > 600) list.shift();
    history.set(socket.id, list);
  });

  socket.on("player:fire", (payload) => {
    const shooter = players.get(socket.id);
    if (!shooter) return;

    const weapon = WEAPONS[payload?.weaponId];
    if (!weapon) return;

    // fire-rate guard (server side) + token bucket
    const now = Date.now();
    const minInterval = 60000 / weapon.rpm;
    const prev = lastFireAt.get(socket.id) || 0;
    if (now - prev < minInterval * 0.8) return;
    const bucket = buckets.get(socket.id) || { tokens: 4, last: now };
    const elapsed = (now - bucket.last) / 1000;
    bucket.tokens = Math.min(6, bucket.tokens + elapsed * 3); // refill
    bucket.last = now;
    if (bucket.tokens < 1) {
      buckets.set(socket.id, bucket);
      return;
    }
    bucket.tokens -= 1;
    buckets.set(socket.id, bucket);

    // discard very stale shots
    if (payload?.ts && now - payload.ts > 250) return;

    const targetId = payload?.targetId;
    if (!targetId) return;

    const target = players.get(targetId);
    if (!target) return;

    // distance check to prevent obvious spoofing
    const shooterPos = pickHistorical(history.get(socket.id), payload?.ts) || shooter;
    const targetPos = pickHistorical(history.get(targetId), payload?.ts) || target;
    const ox = payload.origin?.x ?? shooterPos.x;
    const oy = payload.origin?.y ?? shooterPos.y;
    const oz = payload.origin?.z ?? shooterPos.z;

    const dx = ox - targetPos.x;
    const dy = oy - targetPos.y;
    const dz = oz - targetPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const maxRange = weapon.range + 1;
    if (distSq > maxRange * maxRange) return;

    // angle check: ensure target lies roughly along shot direction
    const dir = payload.direction;
    if (!dir) return;
    const toTarget = {
      x: targetPos.x - ox,
      y: targetPos.y - oy,
      z: targetPos.z - oz,
    };
    const dot =
      dir.x * toTarget.x +
      dir.y * toTarget.y +
      dir.z * toTarget.z;
    const dirMag = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
    const toMag =
      Math.sqrt(
        toTarget.x * toTarget.x +
          toTarget.y * toTarget.y +
          toTarget.z * toTarget.z
      ) || 1;
    const cosTheta = dot / (dirMag * toMag);
    const maxAngleCos = Math.cos((weapon.cone * Math.PI) / 180);
    if (cosTheta < maxAngleCos) return;

    lastFireAt.set(socket.id, now);

    let dmg = weapon.damage;
    const dist = Math.sqrt(distSq);
    if (weapon.falloffEnd > weapon.falloffStart && weapon.falloffEnd > 0) {
      if (dist > weapon.falloffStart) {
        const t = Math.min(1, (dist - weapon.falloffStart) / (weapon.falloffEnd - weapon.falloffStart));
        dmg = Math.max(4, weapon.damage * (1 - 0.6 * t));
      }
    }
    const hitPoint = payload?.hitPoint;
    if (hitPoint && hitPoint.y > (targetPos.y ?? 0) + 1.2) {
      dmg = Math.floor(dmg * 1.5);
    }

    const newHp = Math.max(0, (target.hp ?? 100) - dmg);
    players.set(targetId, { ...target, hp: newHp });

    io.emit("player:damaged", {
      targetId,
      hp: newHp,
      attackerId: socket.id,
      weaponId: payload.weaponId,
    });
    io.emit("combat:hitmarker", { shooterId: socket.id, targetId });

    if (newHp <= 0) {
      const respawnState = { ...target, x: 0, y: 2, z: 0, hp: 100 };
      players.set(targetId, respawnState);
      io.emit("player:respawn", { targetId, x: 0, y: 2, z: 0 });
      io.emit("combat:kill", { killerId: socket.id, victimId: targetId, weaponId: payload.weaponId });
    }
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
    lastFireAt.delete(socket.id);
    history.delete(socket.id);
    buckets.delete(socket.id);
  });
});

// broadcast world state around 20 times per second - skip when empty
setInterval(() => {
  if (players.size === 0) return;
  const payload = [];
  for (const [id, s] of players.entries()) {
    payload.push({ id, ...s });
  }
  io.emit("worldState", { players: payload });
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("[server] listening on", PORT));

function pickHistorical(list, ts) {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  if (!ts) return list[list.length - 1];
  let best = list[0];
  let bestDiff = Math.abs(ts - best.t);
  for (const item of list) {
    const diff = Math.abs(ts - item.t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = item;
    }
  }
  if (Math.abs(ts - best.t) > 400) return undefined;
  return best;
}
