// npm run dev <slug>: watch one post, rebuild on save, push updates to the
// page over Server-Sent Events, and accept per-section edits from the page.
// Listens on 127.0.0.1 only and only ever writes posts/<slug>/article.md.

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { watch, existsSync } from "node:fs";
import path from "node:path";

import { renderArticle, checkFrames, articleSignature, articleHtml, tocHtml, sectionsData } from "./article.js";
import { renderPage, viewerData } from "./page.js";
import { parseArticle, sectionSource, replaceSection } from "./parse.js";
import { renderMarkdown, renderInline, escapeHtml } from "./render.js";
import { compileDiagram, formatIssue, hash, POSTS, VIEWER, ARTICLE, DIAGRAM, ROOT } from "./build.js";
import { closeExporter } from "./export.js";

const DEV_CLIENT = path.join(path.dirname(VIEWER), "dev-client.js");
const REPO = path.dirname(ROOT);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
};

export async function dev(slug, { port = 4600 } = {}) {
  const dir = path.join(POSTS, slug);
  if (!existsSync(dir)) throw new Error(`posts/${slug}/ 不存在。先运行 npm run new ${slug}`);
  const articlePath = path.join(dir, ARTICLE);
  const diagramPath = path.join(dir, DIAGRAM);
  const rel = (f) => `posts/${slug}/${f}`;
  const base = `/writeup/${slug}/`;
  const boot = Date.now().toString(36);

  const state = {
    articleHash: null,
    article: null,
    articleErrors: [],
    diagramHash: null,
    diagram: null,
    diagramError: null,
    frameMap: {},
    frameKey: "",
    errors: [],
    warnings: [],
  };
  const clients = new Set();

  function send(event, payload) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of clients) res.write(msg);
  }

  async function rebuild() {
    const events = [];
    const articleText = await readFile(articlePath, "utf8").catch(() => null);
    const diagramText = await readFile(diagramPath, "utf8").catch(() => null);

    let articleChanged = false;
    if (articleText !== null && hash(articleText) !== state.articleHash) {
      const prev = state.article;
      const next = renderArticle(articleText);
      state.articleHash = hash(articleText);
      state.article = next;
      state.articleErrors = next.errors.map((e) => ({ file: rel(ARTICLE), ...e }));
      articleChanged = true;
      events.push(["file", { hash: state.articleHash }]);
      if (prev && articleSignature(prev) === articleSignature(next)) {
        const changes = [];
        if (prev.introHtml !== next.introHtml) changes.push({ id: "", heading: null, body: next.introHtml });
        next.sections.forEach((s, i) => {
          const p = prev.sections[i];
          if (p.headingHtml !== s.headingHtml || p.bodyHtml !== s.bodyHtml) {
            changes.push({ id: s.id, heading: s.headingHtml, body: s.bodyHtml });
          }
        });
        if (changes.length) events.push(["sections", { changes }]);
      } else if (prev) {
        events.push(["article", { html: articleHtml(next), toc: tocHtml(next), sections: sectionsData(next) }]);
      }
    }

    let svgChanged = false;
    if (diagramText !== null && hash(diagramText) !== state.diagramHash) {
      state.diagramHash = hash(diagramText);
      try {
        state.diagram = await compileDiagram(diagramText);
        state.diagramError = null;
        svgChanged = true;
      } catch (e) {
        state.diagramError = e.message;
      }
    }

    const errors = [...(articleText === null ? [{ file: rel(ARTICLE), message: "文件不存在" }] : state.articleErrors)];
    const warnings = [];
    if (diagramText === null) errors.push({ file: rel(DIAGRAM), message: "文件不存在" });
    else if (state.diagramError) errors.push({ file: rel(DIAGRAM), message: state.diagramError });
    if (state.article && state.diagram) {
      const check = checkFrames(state.article.sections, state.diagram.frames);
      state.frameMap = check.frameMap;
      for (const e of check.errors) errors.push({ file: rel(DIAGRAM), ...e });
      for (const w of check.warnings) warnings.push({ file: rel(ARTICLE), ...w });
    }
    const frameKey = JSON.stringify(state.frameMap);
    if (state.diagram && (svgChanged || frameKey !== state.frameKey)) {
      const d = viewerData(state.article ?? { sections: [] }, state.diagram, state.frameMap);
      events.push(["diagram", { svg: svgChanged ? state.diagram.svg : null, frames: d.frames, width: d.width, height: d.height }]);
    }
    state.frameKey = frameKey;

    const statusChanged = JSON.stringify([errors, warnings]) !== JSON.stringify([state.errors, state.warnings]);
    state.errors = errors;
    state.warnings = warnings;
    events.push(["status", status()]);
    for (const [ev, payload] of events) send(ev, payload);

    if (articleChanged || svgChanged || statusChanged) {
      const t = new Date().toLocaleTimeString();
      console.log(`\n[${t}] rebuilt ${slug}${errors.length ? "" : " ✓"}`);
      for (const w of warnings) console.log(formatIssue(w, "warning"));
      for (const e of errors) console.log(formatIssue(e, "error"));
    }
  }

  const status = () => ({ errors: state.errors, warnings: state.warnings, ready: !!state.article, hash: state.articleHash });

  // Serialise rebuilds; coalesce bursts of file events into one more run.
  let running = null;
  let again = false;
  function schedule() {
    if (running) {
      again = true;
      return running;
    }
    running = rebuild()
      .catch((e) => console.error(e))
      .finally(() => {
        running = null;
        if (again) {
          again = false;
          schedule();
        }
      });
    return running;
  }

  function page() {
    const devScript = `\n  <script type="module" src="/__dev/dev.js"></script>`;
    if (!state.article) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(slug)} — dev</title>
<link rel="stylesheet" href="${base}viewer.css"></head><body class="wu" data-shell>${devScript}</body></html>`;
    }
    return renderPage({ article: state.article, diagram: state.diagram, frameMap: state.frameMap, devScript });
  }

  // ── HTTP ──────────────────────────────────────────────────────────

  let origin = "";
  const server = createServer(async (req, res) => {
    try {
      // Refuse requests whose Host is not us (DNS rebinding) and writes from
      // other origins (CSRF from another local page).
      const host = req.headers.host || "";
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return res.writeHead(403).end();
      if (req.method === "POST" && req.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(req.headers.origin)) {
        return res.writeHead(403).end();
      }
      const url = new URL(req.url, origin);
      const p = url.pathname;

      if (p === "/" || p === base.slice(0, -1)) return redirect(res, base);
      if (p === base) return reply(res, 200, MIME[".html"], page(), { "cache-control": "no-store" });
      if (p === "/__dev/dev.js") return file(res, DEV_CLIENT);
      if (p === "/__dev/events") return events(req, res);
      if (p === "/__dev/section" && req.method === "GET") return getSection(res, url.searchParams.get("id") ?? "");
      if (p === "/__dev/render" && req.method === "POST") return postRender(req, res);
      if (p === "/__dev/save" && req.method === "POST") return postSave(req, res);
      if (p === "/favicon.ico") return file(res, path.join(REPO, "favicon.ico"));
      if (p === `${base}viewer.js` || p === `${base}viewer.css`) return file(res, path.join(VIEWER, path.basename(p)));
      if (p.startsWith(base)) {
        const target = path.join(dir, decodeURIComponent(p.slice(base.length)));
        if (!path.relative(dir, target).startsWith("..")) return file(res, target);
      }
      res.writeHead(404).end("not found");
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500).end(String(e.message));
    }
  });

  function reply(res, code, type, body, headers = {}) {
    res.writeHead(code, { "content-type": type, ...headers }).end(body);
  }
  const json = (res, code, obj) => reply(res, code, MIME[".json"], JSON.stringify(obj), { "cache-control": "no-store" });
  const redirect = (res, to) => res.writeHead(302, { location: to }).end();

  async function file(res, f) {
    try {
      const body = await readFile(f);
      reply(res, 200, MIME[path.extname(f).toLowerCase()] || "application/octet-stream", body, { "cache-control": "no-store" });
    } catch {
      res.writeHead(404).end("not found");
    }
  }

  function events(req, res) {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    res.write(`event: hello\ndata: ${JSON.stringify({ boot, ...status() })}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 20000);
    req.on("close", () => {
      clearInterval(ping);
      clients.delete(res);
    });
  }

  async function body(req) {
    let size = 0;
    const chunks = [];
    for await (const c of req) {
      size += c.length;
      if (size > 2_000_000) throw new Error("请求太大");
      chunks.push(c);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  async function getSection(res, id) {
    const text = await readFile(articlePath, "utf8");
    const s = parseArticle(text).sections.filter((x) => x.id === id);
    if (s.length !== 1) return json(res, 404, { error: s.length ? `章节 id "${id}" 重复` : `找不到章节 "${id}"` });
    json(res, 200, { source: sectionSource(text, s[0]), hash: hash(text) });
  }

  async function postRender(req, res) {
    const { markdown = "" } = await body(req);
    const m = /^(#{2,3})[ \t]+(.*?)(?:[ \t]+\{#[^}]*\})?[ \t]*(?:\r?\n|$)/.exec(markdown);
    const errors = [];
    let html = "";
    if (m) {
      const h = renderInline(m[2]);
      errors.push(...h.errors);
      html += `<h${m[1].length} class="wu-h">${h.html}</h${m[1].length}>`;
    }
    const b = renderMarkdown(m ? markdown.slice(m[0].length) : markdown);
    errors.push(...b.errors);
    html += `<div class="wu-body">${b.html}</div>`;
    json(res, 200, { html, errors: errors.map((e) => e.message) });
  }

  async function postSave(req, res) {
    const { id, source, hash: baseHash } = await body(req);
    if (typeof id !== "string" || typeof source !== "string") return json(res, 400, { error: "参数不对" });
    const current = await readFile(articlePath, "utf8");
    if (hash(current) !== baseHash) {
      return json(res, 409, { error: "article.md 在你打开编辑框之后被改过了，为了不覆盖那些修改，这次没有保存。" });
    }
    const first = /^(#{2,3})[ \t]+.*?\{#([^}]*)\}[ \t]*$/m.exec(source.replace(/^\s+/, "").split(/\r?\n/)[0]);
    if (!first) return json(res, 400, { error: "第一行必须是带 {#id} 的 ## 或 ### 标题" });
    let next;
    try {
      next = replaceSection(current, id, source);
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
    await writeFile(articlePath, next);
    json(res, 200, { hash: hash(next), id: first[2].trim() });
    schedule(); // don't wait for the file watcher
  }

  // ── Watch ─────────────────────────────────────────────────────────

  let timer = 0;
  watch(dir, (ev, name) => {
    if (name && name !== ARTICLE && name !== DIAGRAM) return;
    clearTimeout(timer);
    timer = setTimeout(schedule, 60);
  });
  // Editing the viewer itself: just reload open pages.
  watch(VIEWER, () => {
    clearTimeout(timer);
    timer = setTimeout(() => send("reload", {}), 60);
  });

  console.log(`Building ${slug} …`);
  await schedule();

  for (let i = 0; ; i++) {
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port + i, "127.0.0.1", resolve);
      });
      origin = `http://127.0.0.1:${port + i}`;
      break;
    } catch (e) {
      if (e.code !== "EADDRINUSE" || i > 20) throw e;
    }
  }
  console.log(`\n  预览：${origin}${base}\n  保存 article.md 或 diagram.excalidraw 会自动更新页面。Ctrl+C 退出。\n`);

  const stop = async () => {
    server.close();
    for (const res of clients) res.end();
    await closeExporter();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  return { server, origin, url: `${origin}${base}`, stop };
}
