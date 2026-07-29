import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const profile = path.resolve(".edge-smoke-runtime");
const debuggingPort = 9321;
const pageUrl = process.env.SMOKE_URL ?? "http://127.0.0.1:4173";
await mkdir(profile, { recursive: true });

const browser = spawn(
  edge,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profile}`,
    pageUrl
  ],
  { stdio: "ignore" }
);

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pageTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page" && item.url.startsWith(pageUrl));
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
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const initialized = await cdp.send("Runtime.evaluate", {
      expression: `document.querySelector("#commandCount")?.textContent === "83/83"`,
      returnByValue: true
    });
    if (initialized.result?.value) break;
    if (attempt === 39) {
      const diagnostics = await cdp.send("Runtime.evaluate", {
        expression: `({
          commandCount: document.querySelector("#commandCount")?.textContent,
          controllerRegistry: typeof window.VGCControllerRegistry,
          scripts: Array.from(document.scripts, (script) => script.src || "inline")
        })`,
        returnByValue: true
      });
      throw new Error(`Timed out waiting for the application to initialize: ${JSON.stringify(diagnostics.result?.value)}`);
    }
    await pause(100);
  }
  const result = await cdp.send("Runtime.evaluate", {
    expression: `new Promise((resolve) => {
      const initialTheme = document.documentElement.dataset.theme;
      document.querySelector("#themeToggle").click();
      const theme = document.documentElement.dataset.theme;
      const savedTheme = localStorage.getItem("vgc50x-theme");
      document.querySelector("#demoBtn").click();
      document.querySelector('[data-command="COM"]').click();
      const guidedDialog = document.querySelector("#guidedCommandDialog");
      const interval = guidedDialog.querySelector('[data-parameter="interval"]');
      interval.value = "2";
      interval.dispatchEvent(new Event("change", { bubbles: true }));
      const guidedOpen = guidedDialog.open;
      const guidedPreview = document.querySelector("#guidedCommandPreview").textContent;
      const guidedOptions = document.querySelector("#guidedCommandSelect").options.length;
      document.querySelector("#guidedSendBtn").click();
      const guidedCommand = document.querySelector("#commandInput").value;
      const guidedClosed = !guidedDialog.open;
      setTimeout(() => document.querySelector('[data-command="AYT"]').click(), 180);
      setTimeout(() => document.querySelector('[data-command="PRX"]').click(), 600);
      setTimeout(() => resolve({
        theme,
        themeToggled: theme !== initialTheme,
        themeSaved: savedTheme === theme,
        guidedOpen,
        guidedClosed,
        guidedPreview,
        guidedCommand,
        guidedOptions,
        baudMode: document.querySelector("#baudSelect").value,
        baudOptions: Array.from(document.querySelector("#baudSelect").options, (option) => option.value),
        portLabelPlaceholder: document.querySelector("#portLabelInput")?.placeholder,
        forgetPortsDisabled: document.querySelector("#forgetAllPortsBtn")?.disabled,
        connection: document.querySelector("#connectionPillText").textContent,
        device: document.querySelector("#deviceName").textContent,
        channel: document.querySelector("#channelValue1").textContent,
        logs: Number(document.querySelector("#sessionLogCount").textContent),
        samples: Number(document.querySelector("#sessionSampleCount").textContent),
        dictionary: document.querySelector("#commandCount").textContent,
        rows: document.querySelectorAll(".traffic-row").length,
        implementedAdapters: window.VGCControllerRegistry.implemented.map((item) => item.id),
        skeletonAdapters: window.VGCControllerRegistry.skeletons.map((item) => item.id),
        vgc031Commands: window.VGCControllerRegistry.get("vgc031").commands.length
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
    value?.themeToggled,
    value?.themeSaved,
    value?.guidedOpen,
    value?.guidedClosed,
    value?.guidedPreview === "COM,2",
    value?.guidedCommand === "COM,2",
    value?.guidedOptions >= 40,
    value?.baudMode === "auto",
    value?.baudOptions?.[0] === "auto",
    value?.portLabelPlaceholder === "e.g. COM13",
    value?.forgetPortsDisabled === true,
    value?.connection === "Demo connected",
    value?.device?.includes("VGC501"),
    value?.channel && value.channel !== "—",
    value?.logs >= 6,
    value?.samples >= 3,
    value?.dictionary === "83/83",
    value?.rows >= 6,
    value?.implementedAdapters?.join(",") === "vgc50x,vgc031,vgc083a,vgc083b,vgc083c,vgc094",
    value?.skeletonAdapters?.join(",") === "",
    value?.vgc031Commands === 19
  ];
  if (checks.some((check) => !check)) {
    throw new Error(`Browser smoke checks failed: ${JSON.stringify(value)}`);
  }
  cdp.close();
  console.log(`Browser smoke checks passed: ${JSON.stringify(value)}`);
} finally {
  browser.kill();
}
