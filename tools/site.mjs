// The site generator. Markdown posts and experiments become static article pages, and the hand-edited
// pages (home, blog index, experiments index) get their shared and listed parts refreshed in place.
//
//   blog/posts.json + blog/posts/*.md                     →  blog/<slug>/index.html
//   experiments/experiments.json + experiments/src/*.md   →  experiments/<slug>/index.html
//   index.html, blog/index.html, experiments/index.html   →  regions between <!-- gen:x --> and <!-- /gen:x -->
//
// Markdown and maths are rendered by the writeup engine (marked + KaTeX), so run `npm install` in writeup/ once.

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { renderMarkdown, escapeHtml } from "../writeup/engine/render.js";
import { assembleArticle, checkRecord } from "./article.mjs";
import { L } from "./charts.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SITE = {
  name: "Wenxin Chen",
  url: "https://cwx.world",
  email: "cwx@umich.edu",
  mark: "/assets/img/favicon.png?v=20260822",
  avatar: "/assets/img/25_photo_crop.jpg?v=20261030",
  citeKey: "chen",
  citeAuthor: "Chen, Wenxin",
  cv: "/assets/pdf/cv.pdf?v=20260923",
};

const COLLECTIONS = {
  // The section is called Notes and lives at /notes/ (owner, 2026-11-25: these are notes, not blog posts yet).
  // Its sources stay in blog/ because the writeup engine and the old viewer (blog/post.html) read them there.
  blog: { dir: "notes", manifest: "blog/posts.json", sources: "blog/posts", label: "Notes", labelZh: "笔记", all: "All notes", allZh: "全部笔记" },
  experiments: {
    dir: "experiments",
    manifest: "experiments/experiments.json",
    sources: "experiments/src",
    label: "Experiments",
    labelZh: "实验",
    all: "All experiments",
    allZh: "全部实验",
  },
};

/** Pages written by hand whose gen: regions this script fills. */
const HAND_PAGES = ["index.html", "notes/index.html", "experiments/index.html"];
const GENERATOR = "tools/build.mjs";

const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

// ---------- dates ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function fmtDate(iso, { year = true } = {}) {
  const [, y, m, d] = ISO_DATE.exec(iso);
  return `${MONTHS[Number(m) - 1]} ${Number(d)}${year ? `, ${y}` : ""}`;
}

/** "Nov 1, 2026 – now", "Oct 4 – Nov 14, 2026", or a single date. */
function fmtRange(start, end) {
  if (!end) return fmtDate(start);
  if (end === "now") return `${fmtDate(start)} – now`;
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${fmtDate(start, { year: !sameYear })} – ${fmtDate(end)}`;
}

function fmtDateZh(iso, { year = true } = {}) {
  const [, y, m, d] = ISO_DATE.exec(iso);
  return `${year ? `${y} 年 ` : ""}${Number(m)} 月 ${Number(d)} 日`;
}
function fmtRangeZh(start, end) {
  if (!end) return fmtDateZh(start);
  if (end === "now") return `${fmtDateZh(start)}至今`;
  return `${fmtDateZh(start)} – ${fmtDateZh(end, { year: start.slice(0, 4) !== end.slice(0, 4) })}`;
}

// ---------- two languages ----------
// A post or experiment is bilingual when its Markdown file has a Chinese twin next to it (name.md and name.zh.md).
// Its manifest entry then carries title_zh and description_zh. Everything else stays English.

const isBi = (e) => Boolean(e.zhFile);
/** A manifest field in the entry's languages, escaped. */
const text = (e, field) => (isBi(e) && e[`${field}_zh`] ? L({ en: e[field], zh: e[`${field}_zh`] }) : escapeHtml(e[field]));
const dateText = (e) => {
  const en = e.kind === "experiments" ? fmtRange(e.date, e.end) : fmtDate(e.date);
  return isBi(e) ? L({ en, zh: e.kind === "experiments" ? fmtRangeZh(e.date, e.end) : fmtDateZh(e.date) }) : en;
};
/** Set the page language before the first paint, from the reader's last choice. */
const LANG_SCRIPT = `<script>try{document.documentElement.dataset.lang=localStorage.getItem("lang")==="zh"?"zh":"en"}catch(e){}</script>`;

// ---------- manifests ----------

const slugOf = (file) =>
  file
    .replace(/\.md$/, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .toLowerCase();

/**
 * Read one collection's manifest. An entry is either a Markdown file this script renders ("file"),
 * or a link to a page built elsewhere ("url", e.g. the writeups the writeup engine adds to blog/posts.json).
 */
async function loadCollection(key, { drafts }) {
  const c = COLLECTIONS[key];
  if (!existsSync(path.join(ROOT, c.manifest))) return [];
  let raw;
  try {
    raw = JSON.parse(await read(c.manifest));
  } catch (e) {
    throw new Error(`${c.manifest} is not valid JSON: ${e.message}`);
  }
  if (!Array.isArray(raw)) throw new Error(`${c.manifest} should be an array`);

  const seen = new Map();
  const entries = [];
  raw.forEach((e, i) => {
    const where = `${c.manifest}, entry ${i + 1}${e?.title ? ` ("${e.title}")` : ""}`;
    if (!e || typeof e.title !== "string" || !e.title.trim()) throw new Error(`${where}: "title" is missing`);
    if (typeof e.date !== "string" || !ISO_DATE.test(e.date)) throw new Error(`${where}: "date" should look like 2026-11-25`);
    if (e.end !== undefined && e.end !== "now" && !ISO_DATE.test(e.end)) throw new Error(`${where}: "end" should be a date or "now"`);
    if (!e.file && !e.url) throw new Error(`${where}: needs "file" (a Markdown file in ${c.sources}/) or "url"`);
    // A template is never published, whatever its draft flag says (owner, 2026-11-25: nobody else may see it).
    if ((e.draft || e.template) && !drafts) return;

    const entry = { ...e, kind: key, order: i };
    if (e.file) {
      if (!existsSync(path.join(ROOT, c.sources, e.file))) throw new Error(`${where}: ${c.sources}/${e.file} does not exist`);
      entry.slug = e.slug || slugOf(e.file);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.slug)) {
        throw new Error(`${where}: slug "${entry.slug}" may only use lowercase letters, digits and hyphens (set "slug" to choose one)`);
      }
      if (["posts", "src", "index"].includes(entry.slug)) throw new Error(`${where}: slug "${entry.slug}" is reserved`);
      if (seen.has(entry.slug)) throw new Error(`${where}: slug "${entry.slug}" is already used by "${seen.get(entry.slug)}"`);
      seen.set(entry.slug, e.title);
      entry.href = `/${c.dir}/${entry.slug}/`;
      entry.out = `${c.dir}/${entry.slug}/index.html`;
      const zh = e.file.replace(/\.md$/, ".zh.md");
      if (existsSync(path.join(ROOT, c.sources, zh))) entry.zhFile = zh;
    } else {
      entry.href = e.url;
    }
    entries.push(entry);
  });
  // newest first, the template card last; entries with the same date keep their manifest order
  return entries.sort((a, b) => Boolean(a.template) - Boolean(b.template) || b.date.localeCompare(a.date) || a.order - b.order);
}

// ---------- article body ----------

const unescapeHtml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

// Code colours: the four token colours of the site, as a small TextMate theme for Shiki.
const CODE_THEME = {
  name: "site-light",
  type: "light",
  colors: { "editor.background": "#f8f9fa", "editor.foreground": "#3c4043" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#5f6368", fontStyle: "italic" } },
    { scope: ["string", "punctuation.definition.string"], settings: { foreground: "#137333" } },
    { scope: ["constant.numeric", "constant.language", "constant.character"], settings: { foreground: "#8430ce" } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier"], settings: { foreground: "#1967d2" } },
    { scope: ["keyword.operator"], settings: { foreground: "#3c4043" } },
  ],
};
const PLAIN_CODE = new Set(["", "text", "txt", "plain", "plaintext"]);
let shiki;

/** Colour fenced code blocks that name a language Shiki knows; leave the rest as they are. */
async function highlightCode(html) {
  const blocks = [...html.matchAll(/<pre><code class="language-([\w+#.-]+)">([\s\S]*?)<\/code><\/pre>/g)].filter((m) => !PLAIN_CODE.has(m[1]));
  if (!blocks.length) return html;
  if (!shiki) {
    const require = createRequire(path.join(ROOT, "writeup/package.json"));
    shiki = await import(pathToFileURL(require.resolve("shiki")).href);
  }
  for (const [whole, lang, code] of blocks) {
    if (!(lang in shiki.bundledLanguages) && !(lang in shiki.bundledLanguagesAlias)) continue;
    const out = await shiki.codeToHtml(unescapeHtml(code).replace(/\n$/, ""), { lang, theme: CODE_THEME });
    html = html.replace(whole, () => out.replace(/^<pre[^>]*>/, '<pre tabindex="0">'));
  }
  return html;
}

async function renderFile(src, ctx) {
  const { html: raw, errors } = renderMarkdown(await read(src));
  if (errors.length) throw new Error(`${src}: ${errors.map((e) => e.message).join("\n  ")}`);
  const html = raw
    // links written for the old viewer (/blog/post.html?f=file.md) go to the new pages
    .replace(/href="\/blog\/post\.html\?f=([^"#]+)(#[^"]*)?"/g, (m, file, hash = "") => {
      const target = ctx.byFile.get(decodeURIComponent(file));
      return target ? `href="${target.href}${hash}"` : m;
    })
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, "</table></div>");
  return highlightCode(html);
}

async function readJson(rel, fallback) {
  if (!existsSync(path.join(ROOT, rel))) return fallback;
  try {
    return JSON.parse(await read(rel));
  } catch (e) {
    throw new Error(`${rel} is not valid JSON: ${e.message}`);
  }
}

function citationFor(entry) {
  const year = entry.date.slice(0, 4);
  const isExp = entry.kind === "experiments";
  return `@misc{${SITE.citeKey}${year}${entry.slug.replace(/-/g, "")},
  title        = {${entry.title}},
  author       = {${SITE.citeAuthor}},
  year         = {${year}},
  howpublished = {${isExp ? "Experiment page" : "Note"}},
  url          = {${SITE.url}${entry.href}}
}`;
}

async function renderBody(entry, ctx) {
  const c = COLLECTIONS[entry.kind];
  const names = { en: `${c.sources}/${entry.file}`, zh: entry.zhFile && `${c.sources}/${entry.zhFile}` };
  const en = await renderFile(names.en, ctx);
  const zh = entry.zhFile ? await renderFile(names.zh, ctx) : null;
  let exp = null;
  if (entry.kind === "experiments") {
    // the page's data, generated by the experiment's own scripts and never typed by hand
    names.record = `experiments/data/${entry.slug}.record.json`;
    names.figs = `experiments/data/${entry.slug}.figs.json`;
    exp = { record: await readJson(names.record, { rows: [] }), figs: await readJson(names.figs, {}) };
    checkRecord(exp.record, names.record);
  }
  const citation = exp || entry.cite ? citationFor(entry) : null;
  return assembleArticle({ en, zh, names, exp, citation });
}

// ---------- shared parts ----------

const ICON_DOC =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 1.75h-5a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-8.5z"/><path d="M9.5 1.75v3h3M6 8.5h4M6 11h4"/></svg>';

function headerHtml(active, ctx) {
  const items = [
    ["home", "/", "Home"],
    ["notes", "/notes/", "Notes"],
    ...(ctx.experiments.length ? [["experiments", "/experiments/", "Experiments"]] : []),
  ];
  const links = items.map(([key, href, label]) => `<a href="${href}"${key === active ? ' class="active" aria-current="page"' : ""}>${label}</a>`);
  return `<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="/"><img class="brand-mark" src="${SITE.mark}" alt="" aria-hidden="true" width="24" height="24" />${SITE.name}</a>
    <nav class="nav" id="site-nav">
      ${links.join("\n      ")}
      <a href="${SITE.cv}" class="nav-cta">${ICON_DOC}<span>CV</span></a>
    </nav>
    <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-nav"><span class="burger" aria-hidden="true"></span></button>
  </div>
</header>`;
}

function footerHtml() {
  return `<footer class="foot">
  <div class="foot-inner">
    <div>
      <div class="foot-brand">${SITE.name}</div>
      <div class="foot-mail"><a href="mailto:${SITE.email}">${SITE.email}</a></div>
    </div>
    <div class="foot-meta">© ${new Date().getFullYear()} · Design inspired by <a href="https://wenhaochai.com/" target="_blank" rel="noopener">Wenhao Chai</a></div>
  </div>
</footer>`;
}

// ---------- lists ----------

const metaHtml = (e) => {
  const tag = e.template ? "Template" : e.tag;
  return `<div class="post-meta"><span>${dateText(e)}</span>${tag ? `<span class="tag">${escapeHtml(tag)}</span>` : ""}</div>`;
};
const linkAttrs = (href) => (/^https?:/.test(href) ? ` href="${escapeHtml(href)}" target="_blank" rel="noopener"` : ` href="${escapeHtml(href)}"`);
const thumbHtml = (e) =>
  `<a class="tile-thumb" href="${e.href}" tabindex="-1" aria-hidden="true">${e.thumb ? `<img src="${escapeHtml(e.thumb)}" alt="" loading="lazy" decoding="async" />` : ""}</a>`;
const descHtml = (e, indent) => (e.description ? `\n${indent}<p class="post-desc">${text(e, "description")}</p>` : "");

/** Home: the latest posts, two to a row. */
function homePostsHtml(posts) {
  if (!posts.length) return `<p class="list-empty">No notes yet.</p>`;
  const cards = posts.slice(0, 6).map(
    (p) => `  <article class="post-card">
    ${metaHtml(p)}
    <h3 class="post-title"><a href="${p.href}">${text(p, "title")}</a></h3>${descHtml(p, "    ")}
  </article>`
  );
  return `<div class="post-grid">\n${cards.join("\n")}\n</div>`;
}

/** Home: the experiments section, left out entirely until there is something to show. */
function homeExperimentsHtml(exps) {
  if (!exps.length) return "";
  const tiles = exps.slice(0, 6).map(
    (e) => `      <article class="tile${e.template ? " is-template" : ""}">
        ${thumbHtml(e)}
        ${metaHtml(e).replace("post-meta", "tile-meta")}
        <h3 class="tile-title"><a href="${e.href}">${text(e, "title")}</a></h3>
      </article>`
  );
  return `<section class="journal" id="experiments">
  <div class="page">
    <div class="sec-head">
      <h2 class="sec-title">Experiments</h2>
      <a class="sec-more" href="/experiments/">All experiments</a>
    </div>
    <div class="card-grid">
${tiles.join("\n")}
    </div>
  </div>
</section>`;
}

/** Notes index: one row per note, with Read and any extra links. */
function postListHtml(posts) {
  if (!posts.length) return `<p class="list-empty">No notes yet.</p>`;
  const rows = posts.map((p) => {
    const links = [{ label: "Read", url: p.href }, ...(p.links || [])];
    return `  <article class="post-row">
    ${metaHtml(p)}
    <h3 class="post-title"><a href="${p.href}">${text(p, "title")}</a></h3>${descHtml(p, "    ")}
    <div class="post-links">${links.map((l) => `<a${linkAttrs(l.url)}>${escapeHtml(l.label)}</a>`).join("")}</div>
  </article>`;
  });
  return `<div class="post-list">\n${rows.join("\n")}\n</div>`;
}

/** Experiments index: a card is its picture, dates and title, with no text under them. */
function experimentListHtml(exps) {
  if (!exps.length) return `<p class="list-empty">Nothing published yet.</p>`;
  const rows = exps.map(
    (e) => `  <article class="post-row exp-row${e.template ? " is-template" : ""}">
    ${thumbHtml(e)}
    <div class="post-body">
      ${metaHtml(e)}
      <h3 class="post-title"><a href="${e.href}">${text(e, "title")}</a></h3>
    </div>
  </article>`
  );
  return `<div class="post-list">\n${rows.join("\n")}\n</div>`;
}

// ---------- article page ----------

function tocHtml(toc, { sub }) {
  const bar = toc.map((t) => `<li><a href="#${t.id}">${t.label}</a></li>`).join("");
  const rail = toc
    .map((t) => {
      const kids =
        sub && t.children.length ? `<ol class="side-sub">${t.children.map((k) => `<li><a href="#${k.id}">${k.label}</a></li>`).join("")}</ol>` : "";
      return `<li><a href="#${t.id}">${t.label}</a>${kids}</li>`;
    })
    .join("");
  return {
    bar: `<aside class="ar-toc" aria-label="Contents"><ol>${bar}</ol></aside>`,
    rail: `<div class="ar-side-rail"><nav class="ar-side" aria-label="Contents"><ol class="side-list">${rail}</ol></nav></div>`,
  };
}

async function articlePage(entry, ctx) {
  const c = COLLECTIONS[entry.kind];
  const { html, toc, bilingual } = await renderBody(entry, ctx);
  const isExp = entry.kind === "experiments";
  const hasToc = isExp || toc.length >= 3;
  const nav = hasToc ? tocHtml(toc, { sub: isExp }) : { bar: "", rail: "" };
  const tr = (en, zh) => (bilingual ? L({ en, zh }) : en);
  const title = escapeHtml(entry.title);
  const desc = entry.description ? escapeHtml(entry.description) : "";
  const tag = entry.template ? "Template" : entry.tag;
  const canonical = `${SITE.url}${entry.href}`;
  // An experiment gets its standfirst only once it has finished: the one-sentence result, also used as the description.
  const standfirst = isExp && desc && entry.end && entry.end !== "now" ? `\n<p class="ar-standfirst">${text(entry, "description")}</p>` : "";
  const toggle = bilingual
    ? `<div class="ar-lang" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="true">EN</button><button type="button" data-lang="zh" aria-pressed="false">中文</button></div>`
    : "";
  const sources = [entry.file, entry.zhFile].filter(Boolean).map((f) => `${c.sources}/${f}`);
  if (isExp) sources.push(`experiments/data/${entry.slug}.*.json`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="${GENERATOR}" />
<title>${title} | ${SITE.name}</title>
<meta name="author" content="${SITE.name}" />${desc ? `\n<meta name="description" content="${desc}" />` : ""}
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />${desc ? `\n<meta property="og:description" content="${desc}" />` : ""}
<meta property="og:url" content="${canonical}" />
<link rel="alternate" type="application/rss+xml" title="${SITE.name} — Notes" href="/feed.xml" />
<link rel="icon" href="/favicon.ico?v=20260822" sizes="any" />
<link rel="icon" href="/assets/img/favicon.png?v=20260822" type="image/png" />
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png" />
<link rel="preload" href="/assets/fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />${html.includes('class="katex') ? `\n<link rel="stylesheet" href="/assets/katex/katex.min.css?v=${ctx.katexVersion}" />` : ""}
<link rel="stylesheet" href="/assets/site.css" />
${LANG_SCRIPT}
</head>
<!-- Generated by ${GENERATOR} from ${sources.join(", ")}. Edit those, then run \`npm run build\`. -->
<body data-active="${c.dir}"${hasToc ? " data-sidenav" : ""}>
<a class="skip-link" href="#main">Skip to content</a>
${headerHtml(c.dir, ctx)}
<main>
<div class="ar-page">
<div class="ar-head" id="main" tabindex="-1">
<div class="ar-crumb"><b><a href="/${c.dir}/">${tr(c.label, c.labelZh)}</a></b><span>›</span><span>${text(entry, "title")}</span></div>
<div class="ar-eyebrow"><span>${dateText(entry)}</span>${tag ? `<span class="tag">${escapeHtml(tag)}</span>` : ""}${toggle}</div>
<h1>${text(entry, "title")}</h1>${standfirst}
<div class="ar-authors"><span class="av"><img src="${SITE.avatar}" alt="" width="36" height="36" /></span><span>${tr(`By ${SITE.name}`, `作者 ${SITE.name}`)}</span></div>
</div>
${nav.bar}
<div class="ar-main">
${nav.rail}
${html}
<div class="article-foot"><a href="/${c.dir}/">${tr(c.all, c.allZh)}</a><a href="#main">${tr("Back to top", "回到顶部")}</a></div>
</div>
</div>
</main>
${footerHtml()}
<script src="/assets/site.js" defer></script>${html.includes('class="viz-data"') ? '\n<script type="module" src="/assets/charts.mjs"></script>' : ""}
</body>
</html>
`;
}

// ---------- hand-edited pages ----------

/** Replace what sits between <!-- gen:name --> and <!-- /gen:name -->, keeping the markers and their indentation. */
function fillRegions(page, regions, rel) {
  return page.replace(/^([ \t]*)<!-- gen:([\w-]+) -->[\s\S]*?<!-- \/gen:\2 -->/gm, (whole, indent, name) => {
    if (!(name in regions)) throw new Error(`${rel}: unknown region "gen:${name}" (known: ${Object.keys(regions).join(", ")})`);
    const body = regions[name];
    // prettier-ignore keeps `npx prettier . --write` from reflowing generated markup and causing a diff on the next build
    const lines = body ? ["<!-- prettier-ignore -->", ...body.split("\n")] : [];
    return [`<!-- gen:${name} -->`, ...lines, `<!-- /gen:${name} -->`].map((l) => (l ? indent + l : l)).join("\n");
  });
}

/** Give the site's own stylesheet and scripts a version from their content, so a change is never served stale. */
const STAMPED = ["site.css", "site.js", "charts.mjs"];
const stampAssets = (html, versions) =>
  html.replace(/\/assets\/(site\.css|site\.js|charts\.mjs)(?:\?v=[0-9a-f]+)?(?=")/g, (_, name) => `/assets/${name}?v=${versions[name]}`);

async function fileHash(rel) {
  return createHash("sha1")
    .update(await readFile(path.join(ROOT, rel)))
    .digest("hex")
    .slice(0, 8);
}

// ---------- feed and sitemap ----------

const absolute = (href) => (href.startsWith("/") ? SITE.url + href : href);
const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** RSS for the notes. Dates come from the posts, never from the clock, so an unchanged site builds to the same file. */
function feedXml(blog) {
  const stamp = (iso) => new Date(`${iso}T12:00:00Z`).toUTCString();
  const items = blog.slice(0, 30).map(
    (p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(absolute(p.href))}</link>
      <guid>${xml(absolute(p.href))}</guid>
      <pubDate>${stamp(p.date)}</pubDate>${p.description ? `\n      <description>${xml(p.description)}</description>` : ""}
    </item>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE.name} — Notes</title>
    <link>${SITE.url}/notes/</link>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Notes on research, math, and things I'm learning.</description>
    <language>en-us</language>${blog.length ? `\n    <lastBuildDate>${stamp(blog[0].date)}</lastBuildDate>` : ""}
${items.join("\n")}
  </channel>
</rss>
`;
}

function sitemapXml(blog, experiments) {
  const newest = (list) =>
    list
      .map((e) => e.date)
      .sort()
      .pop();
  const urls = [
    ["/", newest([...blog, ...experiments])],
    ["/notes/", newest(blog)],
    ...blog.filter((p) => p.href.startsWith("/")).map((p) => [p.href, p.date]),
    ...(experiments.length
      ? [["/experiments/", newest(experiments)], ...experiments.map((e) => [e.href, e.end && e.end !== "now" ? e.end : e.date])]
      : []),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([href, date]) => `  <url><loc>${xml(SITE.url + href)}</loc>${date ? `<lastmod>${date}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
}

// ---------- entry point ----------

/**
 * Build everything in memory.
 * @returns {{ outputs: Map<string, string>, stale: string[], counts: object }} outputs maps repo-relative paths to file contents
 */
export async function buildSite({ drafts = false } = {}) {
  const blog = await loadCollection("blog", { drafts });
  // The template has a page in the preview, at /experiments/template/, but is in no list, menu or sitemap.
  const withTemplate = await loadCollection("experiments", { drafts });
  const experiments = withTemplate.filter((e) => !e.template);
  const katexVersion = JSON.parse(await read("writeup/node_modules/katex/package.json")).version;
  const ctx = { blog, experiments, katexVersion, byFile: new Map(blog.filter((p) => p.file).map((p) => [p.file, p])) };
  const versions = {};
  for (const name of STAMPED) versions[name] = await fileHash(`assets/${name}`);

  const outputs = new Map();
  for (const entry of [...blog, ...withTemplate]) {
    if (entry.out) outputs.set(entry.out, stampAssets(await articlePage(entry, ctx), versions));
  }

  for (const rel of HAND_PAGES) {
    if (!existsSync(path.join(ROOT, rel))) continue;
    const page = await read(rel);
    const active = /<body[^>]*\bdata-active="([\w-]+)"/.exec(page)?.[1] ?? "";
    const regions = {
      header: headerHtml(active, ctx),
      footer: footerHtml(),
      "home-posts": homePostsHtml(blog),
      "home-experiments": homeExperimentsHtml(experiments),
      "post-list": postListHtml(blog),
      "experiment-list": experimentListHtml(experiments),
    };
    outputs.set(rel, stampAssets(fillRegions(page, regions, rel), versions));
  }

  outputs.set("feed.xml", feedXml(blog));
  outputs.set("sitemap.xml", sitemapXml(blog, experiments));

  // generated article folders on disk that no manifest entry produces any more
  const stale = [];
  for (const c of Object.values(COLLECTIONS)) {
    const dir = path.join(ROOT, c.dir);
    if (!existsSync(dir)) continue;
    for (const d of await readdir(dir, { withFileTypes: true })) {
      const rel = `${c.dir}/${d.name}/index.html`;
      if (!d.isDirectory() || outputs.has(rel) || !existsSync(path.join(ROOT, rel))) continue;
      if ((await read(rel)).includes(`<meta name="generator" content="${GENERATOR}"`)) stale.push(`${c.dir}/${d.name}/`);
    }
  }

  return { outputs, stale, counts: { posts: blog.length, experiments: experiments.length } };
}
