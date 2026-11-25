// npm run dev — preview the site at http://127.0.0.1:4700, drafts included.
// Generated pages are built in memory on each request, so saving a Markdown file and reloading is enough;
// nothing is written to disk (run `npm run build` for that).

import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";

import { buildSite, ROOT } from "./site.mjs";

const PORT = Number(process.env.PORT) || 4700;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
};

const errorPage = (message) =>
  `<!doctype html><meta charset="utf-8"><title>Build error</title><pre style="font:14px/1.6 ui-monospace,Menlo,monospace;padding:24px;color:#d93025;white-space:pre-wrap">Build error\n\n${message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre>`;

http
  .createServer(async (req, res) => {
    const send = (status, type, body) => {
      res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
      res.end(body);
    };
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
    } catch {
      return send(400, "text/plain", "bad request");
    }
    let file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) return send(403, "text/plain", "forbidden");
    if (rel === "" || rel.endsWith("/") || (existsSync(file) && statSync(file).isDirectory())) {
      if (rel && !rel.endsWith("/")) {
        res.writeHead(301, { location: `/${rel}/` });
        return res.end();
      }
      rel += "index.html";
      file = path.join(ROOT, rel);
    }

    if (rel.endsWith(".html")) {
      try {
        const { outputs } = await buildSite({ drafts: true });
        if (outputs.has(rel)) return send(200, TYPES[".html"], outputs.get(rel));
      } catch (e) {
        return send(500, TYPES[".html"], errorPage(e.message));
      }
    }
    if (!existsSync(file) || !statSync(file).isFile()) return send(404, "text/plain", `not found: /${rel}`);
    res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
    createReadStream(file).pipe(res);
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Preview with drafts: http://127.0.0.1:${PORT}/   (Ctrl+C to stop)`));
