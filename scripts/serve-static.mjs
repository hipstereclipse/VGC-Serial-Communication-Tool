import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
const portIndex = process.argv.indexOf("-p");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3000);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json"
};

createServer(async (request, response) => {
  try {
    const urlPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const candidate = path.resolve(root, `.${urlPath === "/" ? "/index.html" : urlPath}`);
    if (!candidate.startsWith(root + path.sep)) throw new Error("Invalid path");
    const info = await stat(candidate);
    const file = info.isDirectory() ? path.join(candidate, "index.html") : candidate;
    response.writeHead(200, {
      "content-type": types[path.extname(file)] || "application/octet-stream",
      "cache-control": file.endsWith(".html") ? "no-cache" : "public, max-age=3600"
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`VGC50x Serial Console ready at http://127.0.0.1:${port}`);
});
