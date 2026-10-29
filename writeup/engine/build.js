// Build posts/<slug>/ → site/<slug>/ and sync blog/posts.json.

import { readFile, writeFile, mkdir, rm, readdir, cp, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderArticle, checkFrames } from "./article.js";
import { renderPage } from "./page.js";
import { exportScene } from "./export.js";
import { updatePostsJsonFile } from "./posts.js";

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.dirname(ENGINE);
export const POSTS = path.join(ROOT, "posts");
export const SITE = path.join(ROOT, "site");
export const VIEWER = path.join(ENGINE, "viewer");
export const POSTS_JSON = path.join(path.dirname(ROOT), "blog", "posts.json");

export const ARTICLE = "article.md";
export const DIAGRAM = "diagram.excalidraw";
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 16);

/** Parse and export a .excalidraw file. Throws an Error with a readable message. */
export async function compileDiagram(text) {
  let scene;
  try {
    scene = JSON.parse(text);
  } catch (e) {
    throw new Error(`不是合法的 JSON（${e.message}）`);
  }
  if (!Array.isArray(scene?.elements)) throw new Error("没有 elements 数组，不像是 Excalidraw 文件");
  if (!scene.elements.some((el) => !el.isDeleted)) throw new Error("图是空的");
  return exportScene(scene);
}

/**
 * Compile one post without writing anything.
 * Issues are {file, line?, message}; file is relative to writeup/.
 */
export async function compilePost(slug) {
  const dir = path.join(POSTS, slug);
  const rel = (f) => path.posix.join("posts", slug, f);
  const errors = [];
  const warnings = [];

  let article = null;
  const articleText = await readFile(path.join(dir, ARTICLE), "utf8").catch(() => null);
  if (articleText === null) errors.push({ file: rel(ARTICLE), message: "文件不存在" });
  else {
    article = renderArticle(articleText);
    for (const e of article.errors) errors.push({ file: rel(ARTICLE), ...e });
  }

  let diagram = null;
  const diagramText = await readFile(path.join(dir, DIAGRAM), "utf8").catch(() => null);
  if (diagramText === null) errors.push({ file: rel(DIAGRAM), message: "文件不存在" });
  else {
    try {
      diagram = await compileDiagram(diagramText);
    } catch (e) {
      errors.push({ file: rel(DIAGRAM), message: e.message });
    }
  }

  let frameMap = {};
  if (article && diagram) {
    const check = checkFrames(article.sections, diagram.frames);
    frameMap = check.frameMap;
    for (const e of check.errors) errors.push({ file: rel(DIAGRAM), ...e });
    for (const w of check.warnings) warnings.push({ file: rel(ARTICLE), ...w });
  }
  return { slug, dir, article, diagram, frameMap, errors, warnings };
}

/** Write a compiled post to site/<slug>/ (replacing what was there). */
export async function writePost(post) {
  const out = path.join(SITE, post.slug);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  // Images and other files next to article.md are published as-is.
  await cp(post.dir, out, {
    recursive: true,
    filter: (src) => {
      const name = path.basename(src);
      return src === post.dir || !(name.startsWith(".") || name === ARTICLE || name === DIAGRAM);
    },
  });
  await writeFile(path.join(out, "index.html"), renderPage(post));
  await copyFile(path.join(VIEWER, "viewer.js"), path.join(out, "viewer.js"));
  await copyFile(path.join(VIEWER, "viewer.css"), path.join(out, "viewer.css"));
  return out;
}

export async function listSlugs() {
  if (!existsSync(POSTS)) return [];
  const entries = await readdir(POSTS, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

export function formatIssue(issue, level) {
  const mark = level === "error" ? "\x1b[31m✖ error\x1b[0m" : "\x1b[33m▲ warning\x1b[0m";
  const where = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ""}` : "";
  return `${mark}  ${where}${where ? "  " : ""}${issue.message}`;
}

/**
 * Build every non-draft post. Nothing is written unless all of them pass.
 * @returns {Promise<boolean>} success
 */
export async function buildAll({ log = console.log } = {}) {
  const slugs = await listSlugs();
  const published = [];
  const errors = [];
  const warnings = [];
  for (const slug of slugs) {
    if (!SLUG.test(slug)) {
      errors.push({ file: `posts/${slug}`, message: "目录名（slug）只能用小写字母、数字和连字符" });
      continue;
    }
    // Read the draft flag first so drafts never pay for a diagram export.
    const head = await readFile(path.join(POSTS, slug, ARTICLE), "utf8").catch(() => "");
    const { meta } = renderArticle(head);
    if (meta.draft) {
      log(`  · ${slug}  (draft, skipped)`);
      continue;
    }
    const post = await compilePost(slug);
    errors.push(...post.errors);
    warnings.push(...post.warnings);
    published.push(post);
  }
  for (const w of warnings) log(formatIssue(w, "warning"));
  for (const e of errors) log(formatIssue(e, "error"));
  if (errors.length) {
    log(`\n构建失败：${errors.length} 个错误，什么都没有写入。`);
    return false;
  }

  for (const post of published) {
    await writePost(post);
    log(`  ✓ ${post.slug}  →  site/${post.slug}/`);
  }
  // Remove output for posts that are now drafts or were deleted.
  if (existsSync(SITE)) {
    const keep = new Set(published.map((p) => p.slug));
    for (const e of await readdir(SITE, { withFileTypes: true })) {
      if (e.isDirectory() && !keep.has(e.name)) {
        await rm(path.join(SITE, e.name), { recursive: true, force: true });
        log(`  − site/${e.name}/ removed (draft or deleted)`);
      }
    }
  }
  const changed = await updatePostsJsonFile(
    POSTS_JSON,
    published.map((p) => ({ slug: p.slug, ...p.article.meta }))
  );
  log(changed ? "  ✓ blog/posts.json updated" : "  · blog/posts.json unchanged");
  return true;
}
