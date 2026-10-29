// Excalidraw → SVG export, run inside headless Chromium.
//
// Excalidraw's exporter needs a real DOM (canvas text metrics, FontFace,
// fetch for font files), so we bundle a tiny entry with esbuild, serve it
// from a throwaway localhost server, and call it through Playwright. One
// browser is reused for every export in a process (dev mode re-exports on
// every save).

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(ENGINE);
const CACHE = path.join(ENGINE, ".cache", "excalidraw");
const EXCALIDRAW_DIST = path.join(ROOT, "node_modules", "@excalidraw", "excalidraw", "dist", "prod");

const MIME = {
  ".js": "text/javascript",
  ".html": "text/html",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".css": "text/css",
};

const PAGE = `<!doctype html><meta charset="utf-8"><body>
<script>window.EXCALIDRAW_ASSET_PATH = location.origin + "/assets/";</script>
<script type="module" src="/bundle/excalidraw-entry.js"></script>`;

async function ensureBundle() {
  const out = path.join(CACHE, "excalidraw-entry.js");
  const entry = path.join(ENGINE, "excalidraw-entry.js");
  if (existsSync(out) && (await stat(out)).mtimeMs >= (await stat(entry)).mtimeMs) return;
  const esbuild = await import("esbuild");
  await esbuild.build({
    entryPoints: [entry],
    outdir: CACHE,
    bundle: true,
    format: "esm",
    splitting: true,
    minify: true,
    define: { "process.env.NODE_ENV": '"production"', "process.env.IS_PREACT": '"false"' },
    loader: { ".woff2": "file", ".css": "empty" },
    logLevel: "error",
  });
}

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, "http://x");
      let file = null;
      if (url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html" }).end(PAGE);
        return;
      }
      if (url.pathname.startsWith("/bundle/")) file = path.join(CACHE, url.pathname.slice(8));
      if (url.pathname.startsWith("/assets/")) file = path.join(EXCALIDRAW_DIST, url.pathname.slice(8));
      if (file && !path.relative(ROOT, file).startsWith("..")) {
        try {
          const body = await readFile(file);
          res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" }).end(body);
          return;
        } catch {}
      }
      res.writeHead(404).end();
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

let session = null;

async function open() {
  await ensureBundle();
  const { chromium } = await import("playwright");
  const server = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page
    .waitForFunction(() => window.__exportReady === true, null, { timeout: 30000 })
    .catch(() => {
      throw new Error("Excalidraw exporter failed to load in Chromium:\n" + errors.join("\n"));
    });
  return { server, browser, page };
}

/**
 * Export a parsed .excalidraw scene.
 * @returns {Promise<{svg: string, width: number, height: number,
 *   offset: {x: number, y: number},
 *   frames: {id: string, name: string, x: number, y: number, w: number, h: number}[]}>}
 *   Frame boxes are in the exported SVG's viewBox coordinates.
 */
export async function exportScene(scene, opts = {}) {
  session ??= open();
  const { page } = await session;
  const result = await page.evaluate((args) => window.exportDiagram(...args), [scene, opts]);

  // Our offset must agree with the one Excalidraw used for its clip paths;
  // if a future Excalidraw changes the bounds rule, fail loudly here rather
  // than silently mis-aim the camera.
  for (const f of result.frames) {
    if (f.clip && (Math.abs(f.clip.x - f.x) > 0.01 || Math.abs(f.clip.y - f.y) > 0.01)) {
      throw new Error(`Frame "${f.name}" coordinate check failed: computed (${f.x}, ${f.y}), ` + `Excalidraw used (${f.clip.x}, ${f.clip.y}).`);
    }
    delete f.clip;
  }
  return result;
}

/** Complete a hand-written scene into a full .excalidraw document. */
export async function normalizeScene(scene) {
  session ??= open();
  const { page } = await session;
  return page.evaluate((s) => window.normalizeScene(s), scene);
}

export async function closeExporter() {
  if (!session) return;
  const { server, browser } = await session;
  session = null;
  await browser.close();
  server.close();
}
