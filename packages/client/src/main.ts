// packages/client/src/main.ts
import "./style.css";

// start the Babylon game app
import "./app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  root.innerHTML = "";
}

// don't add Socket.IO here
// all socket is handled by network.ts in
// packages/client/src/network.ts