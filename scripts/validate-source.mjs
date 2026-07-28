import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const required = [
  "app/layout.js",
  "app/page.js",
  "app/globals.css",
  "public/app.js",
  "public/manifest.webmanifest",
  ".openai/hosting.json"
];

for (const relative of required) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    throw new Error(`Missing required file: ${relative}`);
  }
}

const clientSource = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
new vm.Script(clientSource, { filename: "public/app.js" });

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "public/manifest.webmanifest"), "utf8")
);
const hosting = JSON.parse(
  fs.readFileSync(path.join(root, ".openai/hosting.json"), "utf8")
);

if (!manifest.name || !hosting.project_id) {
  throw new Error("Manifest or hosting configuration is incomplete.");
}

console.log("Source validation passed.");
