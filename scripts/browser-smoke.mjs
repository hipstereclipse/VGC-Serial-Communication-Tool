import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const profile = path.resolve(".edge-smoke-runtime");
const debuggingPort = 9321;
await mkdir(profile, { recursive: true });

const browser = spawn(
  edge,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profile}`,
    "http://127.0.0.1:4173"
  ],
  { stdio: "ignore" }
);

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pageTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page" && item.url.includes("127.0.0.1:4173"));
      if (target) return target;
    } catch {}
    await pause(250);
  }
  throw new Error("Timed out waiting for the headless browser.");
}

function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("DevTools WebSocket failed.")), { once: true });
  });
  return {
    ready,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close: () => socket.close()
  };
}

try {
  const target = await pageTarget();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Runtime.enable");
  await pause(1000);
  const result = await cdp.send("Runtime.evaluate", {
    expression: `new Promise((resolve) => {
      document.querySelector("#demoBtn").click();
      setTimeout(() => document.querySelector('[data-command="AYT"]').click(), 80);
      setTimeout(() => document.querySelector('[data-command="PRX"]').click(), 500);
      setTimeout(() => resolve({
        connection: document.querySelector("#connectionPillText").textContent,
        device: document.querySelector("#deviceName").textContent,
        channel: document.querySelector("#channelValue1").textContent,
        logs: Number(document.querySelector("#sessionLogCount").textContent),
        samples: Number(document.querySelector("#sessionSampleCount").textContent),
        dictionary: document.querySelector("#commandCount").textContent,
        rows: document.querySelectorAll(".traffic-row").length
      }), 1100);
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(`Browser runtime exception: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }
  const value = result.result?.value;
  const checks = [
    value?.connection === "Demo connected",
    value?.device?.includes("VGC501"),
    value?.channel && value.channel !== "—",
    value?.logs >= 6,
    value?.samples >= 3,
    value?.dictionary === "83/83",
    value?.rows >= 6
  ];
  if (checks.some((check) => !check)) {
    throw new Error(`Browser smoke checks failed: ${JSON.stringify(value)}`);
  }
  cdp.close();
  console.log(`Browser smoke checks passed: ${JSON.stringify(value)}`);
} finally {
  browser.kill();
}
