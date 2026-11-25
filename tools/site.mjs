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

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SITE = {
  name: "Wenxin Chen",
  url: "https://cwx.world",
  email: "cwx@umich.edu",
  mark: "/assets/img/favicon.png?v=20260822",
  avatar: "/assets/img/25_photo_crop.jpg?v=20261030",
  cv: "/assets/pdf/cv.pdf?v=20260923",
};

const COLLECTIONS = {
  blog: { dir: "blog", manifest: "blog/posts.json", sources: "blog/posts", label: "Blog", all: "All posts" },
  experiments: {
    dir: "experiments",
    manifest: "experiments/experiments.json",
    sources: "experiments/src",
    label: "Experiments",
    all: "All experiments",
  },
};

/** Pages written by hand whose gen: regions this script fills. */
const HAND_PAGES = ["index.html", "blog/index.html", "experiments/index.html"];
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
    if (e.draft && !drafts) return;

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
    } else {
      entry.href = e.url;
    }
    entries.push(entry);
  });
  // newest first; entries with the same date keep their manifest order
  return entries.sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order);
}

// ---------- article body ----------

const unescapeHtml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const stripTags = (html) =>
  html
    .replace(/<annotation[\s\S]*?<\/annotation>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();

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

/**
 * Give every h2 and h3 an id and collect the contents list.
 * A heading may carry its own id, and data-toc="Short label" to say what the contents list should call it.
 */
function withHeadings(html) {
  const used = new Set();
  const toc = [];
  const out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_, level, attrs, inner) => {
    let id = /\bid="([^"]+)"/.exec(attrs)?.[1];
    if (!id) {
      const base =
        stripTags(inner)
          .toLowerCase()
          .replace(/&[a-z#0-9]+;/g, " ")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "section";
      id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      attrs += ` id="${id}"`;
    }
    used.add(id);
    const label = /\bdata-toc="([^"]*)"/.exec(attrs)?.[1] ?? inner.replace(/<\/?a\b[^>]*>/g, "").trim();
    if (level === "2") toc.push({ id, label, children: [] });
    else if (toc.length) toc[toc.length - 1].children.push({ id, label });
    const anchor = level === "2" ? ` <a class="hanchor" href="#${id}" aria-label="Link to this section">#</a>` : "";
    return `<h${level}${attrs}>${inner}${anchor}</h${level}>`;
  });
  return { html: out, toc };
}

async function renderBody(entry, ctx) {
  const c = COLLECTIONS[entry.kind];
  const src = `${c.sources}/${entry.file}`;
  const { html: raw, errors } = renderMarkdown(await read(src));
  if (errors.length) throw new Error(`${src}: ${errors.map((e) => e.message).join("\n  ")}`);

  let html = raw
    // links written for the old viewer (/blog/post.html?f=file.md) go to the new pages
    .replace(/href="\/blog\/post\.html\?f=([^"#]+)(#[^"]*)?"/g, (m, file, hash = "") => {
      const target = ctx.byFile.get(decodeURIComponent(file));
      return target ? `href="${target.href}${hash}"` : m;
    })
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, "</table></div>");
  html = await highlightCode(html);
  return withHeadings(html);
}

// ---------- shared parts ----------

const ICON_DOC =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 1.75h-5a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-8.5z"/><path d="M9.5 1.75v3h3M6 8.5h4M6 11h4"/></svg>';

function headerHtml(active, ctx) {
  const items = [
    ["home", "/", "Home"],
    ["blog", "/blog/", "Blog"],
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
  const date = e.kind === "experiments" ? fmtRange(e.date, e.end) : fmtDate(e.date);
  const tag = e.template ? "Template" : e.tag;
  return `<div class="post-meta"><span>${date}</span>${tag ? `<span class="tag">${escapeHtml(tag)}</span>` : ""}</div>`;
};
const linkAttrs = (href) => (/^https?:/.test(href) ? ` href="${escapeHtml(href)}" target="_blank" rel="noopener"` : ` href="${escapeHtml(href)}"`);
const thumbHtml = (e) =>
  `<a class="tile-thumb" href="${e.href}" tabindex="-1" aria-hidden="true">${e.thumb ? `<img src="${escapeHtml(e.thumb)}" alt="" loading="lazy" decoding="async" />` : ""}</a>`;

/** Home: the latest posts, two to a row. */
function homePostsHtml(posts) {
  if (!posts.length) return `<p class="list-empty">No posts yet.</p>`;
  const cards = posts.slice(0, 6).map(
    (p) => `  <article class="post-card">
    ${metaHtml(p)}
    <h3 class="post-title"><a href="${p.href}">${escapeHtml(p.title)}</a></h3>${p.description ? `\n    <p class="post-desc">${escapeHtml(p.description)}</p>` : ""}
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
        <h3 class="tile-title"><a href="${e.href}">${escapeHtml(e.title)}</a></h3>
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

/** Blog index: one row per post, with Read and any extra links. */
function postListHtml(posts) {
  if (!posts.length) return `<p class="list-empty">No posts yet.</p>`;
  const rows = posts.map((p) => {
    const links = [{ label: "Read", url: p.href }, ...(p.links || [])];
    return `  <article class="post-row">
    ${metaHtml(p)}
    <h3 class="post-title"><a href="${p.href}">${escapeHtml(p.title)}</a></h3>${p.description ? `\n    <p class="post-desc">${escapeHtml(p.description)}</p>` : ""}
    <div class="post-links">${links.map((l) => `<a${linkAttrs(l.url)}>${escapeHtml(l.label)}</a>`).join("")}</div>
  </article>`;
  });
  return `<div class="post-list">\n${rows.join("\n")}\n</div>`;
}

/** Experiments index: thumbnail left, dates and title right. */
function experimentListHtml(exps) {
  if (!exps.length) return `<p class="list-empty">Nothing published yet.</p>`;
  const rows = exps.map(
    (e) => `  <article class="post-row exp-row${e.template ? " is-template" : ""}">
    ${thumbHtml(e)}
    <div class="post-body">
      ${metaHtml(e)}
      <h3 class="post-title"><a href="${e.href}">${escapeHtml(e.title)}</a></h3>${e.description ? `\n      <p class="post-desc">${escapeHtml(e.description)}</p>` : ""}
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
  const { html, toc } = await renderBody(entry, ctx);
  const isExp = entry.kind === "experiments";
  const hasToc = toc.length >= 3;
  const nav = hasToc ? tocHtml(toc, { sub: isExp }) : { bar: "", rail: "" };
  const title = escapeHtml(entry.title);
  const desc = entry.description ? escapeHtml(entry.description) : "";
  const date = isExp ? fmtRange(entry.date, entry.end) : fmtDate(entry.date);
  const tag = entry.template ? "Template" : entry.tag;
  const canonical = `${SITE.url}${entry.href}`;

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
<link rel="icon" href="/favicon.ico?v=20260822" sizes="any" />
<link rel="icon" href="/assets/img/favicon.png?v=20260822" type="image/png" />
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png" />
<link rel="preload" href="/assets/fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />${html.includes('class="katex') ? `\n<link rel="stylesheet" href="/assets/katex/katex.min.css?v=${ctx.katexVersion}" />` : ""}
<link rel="stylesheet" href="/assets/site.css" />
</head>
<!-- Generated by ${GENERATOR} from ${c.sources}/${entry.file}. Edit that file, then run \`npm run build\`. -->
<body data-active="${entry.kind}"${hasToc ? " data-sidenav" : ""}>
<a class="skip-link" href="#main">Skip to content</a>
${headerHtml(entry.kind, ctx)}
<main>
<div class="ar-page">
<div class="ar-head" id="main" tabindex="-1">
<div class="ar-crumb"><b><a href="/${c.dir}/">${c.label}</a></b><span>›</span><span>${title}</span></div>
<div class="ar-eyebrow"><span>${date}</span>${tag ? `<span class="tag">${escapeHtml(tag)}</span>` : ""}</div>
<h1>${title}</h1>${isExp && desc ? `\n<p class="ar-standfirst">${desc}</p>` : ""}
<div class="ar-authors"><span class="av"><img src="${SITE.avatar}" alt="" width="36" height="36" /></span><span>By ${SITE.name}</span></div>
</div>
${nav.bar}
<div class="ar-main">
${nav.rail}
${html}
<div class="article-foot"><a href="/${c.dir}/">${c.all}</a><a href="#main">Back to top</a></div>
</div>
</div>
</main>
${footerHtml()}
<script src="/assets/site.js" defer></script>
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

const stampAssets = (html, versions) =>
  html.replace(/(\/assets\/site\.(css|js))(?:\?v=[0-9a-f]+)?(?=")/g, (_, file, ext) => `${file}?v=${versions[ext]}`);

async function fileHash(rel) {
  return createHash("sha1")
    .update(await readFile(path.join(ROOT, rel)))
    .digest("hex")
    .slice(0, 8);
}

// ---------- entry point ----------

/**
 * Build everything in memory.
 * @returns {{ outputs: Map<string, string>, stale: string[], counts: object }} outputs maps repo-relative paths to file contents
 */
export async function buildSite({ drafts = false } = {}) {
  const blog = await loadCollection("blog", { drafts });
  const experiments = await loadCollection("experiments", { drafts });
  const katexVersion = JSON.parse(await read("writeup/node_modules/katex/package.json")).version;
  const ctx = { blog, experiments, katexVersion, byFile: new Map(blog.filter((p) => p.file).map((p) => [p.file, p])) };
  const versions = { css: await fileHash("assets/site.css"), js: await fileHash("assets/site.js") };

  const outputs = new Map();
  for (const entry of [...blog, ...experiments]) {
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
