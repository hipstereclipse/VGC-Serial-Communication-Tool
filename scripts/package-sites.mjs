import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("dist");
await mkdir(path.join(output, "server"), { recursive: true });
await mkdir(path.join(output, ".openai"), { recursive: true });
try {
  await access(path.join(output, "server", "index.js"));
} catch {
  await copyFile(path.join(output, "server", "index.mjs"), path.join(output, "server", "index.js"));
}
await copyFile(path.resolve(".openai", "hosting.json"), path.join(output, ".openai", "hosting.json"));

console.log("Sites package prepared in dist/.");
