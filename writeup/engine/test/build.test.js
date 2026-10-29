// Build script: article parsing, Markdown/KaTeX rendering, section ↔ frame
// validation, posts.json sync, and the diagram coordinate mapping.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseArticle } from "../parse.js";
import { protectMath, renderMarkdown } from "../render.js";
import { renderArticle, checkFrames, articleSignature } from "../article.js";
import { syncPostsJson, updatePostsJsonFile } from "../posts.js";
import { compileDiagram } from "../build.js";
import { closeExporter } from "../export.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fm = (body, head = "title: T\ndate: 2026-01-01") => `---\n${head}\n---\n${body}`;
const messages = (r) => r.errors.map((e) => e.message).join("\n");

after(closeExporter);

// ── Front matter ──────────────────────────────────────────────────────

test("front matter: title, date, description, draft", () => {
  const { meta, errors } = parseArticle(fm("", 'title: "A: B"\ndate: 2026-10-29\ndescription: d\ndraft: true'));
  assert.deepEqual(errors, []);
  assert.deepEqual(meta, { title: "A: B", date: "2026-10-29", description: "d", draft: true });
});

test("front matter: draft defaults to false, description to empty", () => {
  const { meta } = parseArticle(fm(""));
  assert.equal(meta.draft, false);
  assert.equal(meta.description, "");
});

test("front matter: missing, invalid YAML, missing title, bad date, non-boolean draft", () => {
  assert.match(messages(parseArticle("## A {#a}\n")), /缺少开头的 YAML front matter/);
  assert.match(messages(parseArticle(fm("", "title: [unclosed\ndate: 2026-01-01"))), /不是合法的 YAML/);
  assert.match(messages(parseArticle(fm("", "date: 2026-01-01"))), /缺少 title/);
  assert.match(messages(parseArticle(fm("", "title: T\ndate: 29/10/2026"))), /YYYY-MM-DD/);
  assert.match(messages(parseArticle(fm("", "title: T\ndate: 2026-01-01\ndraft: yes please"))), /draft 只能是 true 或 false/);
});

// ── Sections ──────────────────────────────────────────────────────────

test("sections: ids, levels, parents, titles, line numbers, intro range", () => {
  const text = fm("Intro.\n\n## First **bold** {#first}\nA\n### Sub {#first/sub}\nB\n## Second {#second-part}\nC\n");
  const { sections, intro, errors } = parseArticle(text);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    sections.map((s) => [s.id, s.level, s.parent, s.title, s.line]),
    [
      ["first", 2, null, "First **bold**", 7],
      ["first/sub", 3, "first", "Sub", 9],
      ["second-part", 2, null, "Second", 11],
    ]
  );
  assert.equal(text.slice(intro.start, intro.end), "Intro.\n\n");
  // A main section's own range stops at its first sub-section.
  assert.equal(text.slice(sections[0].start, sections[0].end), "## First **bold** {#first}\nA\n");
});

test("sections: # and #### headings are ordinary content", () => {
  const { sections, errors } = parseArticle(fm("# Big\n## A {#a}\n#### Small\n##### Smaller\n"));
  assert.deepEqual(errors, []);
  assert.deepEqual(
    sections.map((s) => s.id),
    ["a"]
  );
});

test("sections: id errors are reported with line numbers", () => {
  const cases = [
    ["## No id\n", /## 标题缺少 \{#id\}/],
    ["## Upper {#Encoder}\n", /主章节 id "Encoder" 格式不对/],
    ["## Slash {#a/b}\n", /主章节 id "a\/b" 格式不对/],
    ["## Space {#a b}\n", /主章节 id "a b" 格式不对/],
    ["## A {#a}\n### Flat {#detail}\n", /子组件 id "detail" 格式不对/],
    ["### Orphan {#a/b}\n", /出现在第一个 ## 主章节之前/],
    ["## A {#a}\n### Wrong {#b/c}\n", /父 id 应该是所在主章节 "a"/],
    ["## A {#a}\ntext\n## Again {#a}\n", /章节 id "a" 重复（第一次出现在第 5 行）/],
    ["## A {#a}\n### S {#a/s}\n### S2 {#a/s}\n", /章节 id "a\/s" 重复/],
  ];
  for (const [body, re] of cases) {
    const r = parseArticle(fm(body));
    assert.match(messages(r), re, body);
    assert.ok(
      r.errors.every((e) => e.line >= 5),
      `line numbers point into the body: ${body}`
    );
  }
});

test("sections: headings inside code, $$ blocks and comments are ignored", () => {
  const body = [
    "```",
    "## code {#code}",
    "```",
    "    ```js",
    "    ## indented fence {#indented}",
    "    ```",
    "$$",
    "## math {#math}",
    "$$",
    "<!-- note",
    "## comment {#comment}",
    "-->",
    "## Real {#real}",
  ].join("\n");
  const r = parseArticle(fm(body));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(
    r.sections.map((s) => s.id),
    ["real"]
  );
});

// ── Rendering ─────────────────────────────────────────────────────────

test("math is lifted out before Markdown, but not from code", () => {
  const { md, math } = protectMath("a \\(x_1\\) b $$y_2$$ `\\(no\\)` c\n```\n$$no$$\n```\n");
  assert.deepEqual(math, [
    { tex: "x_1", display: false },
    { tex: "y_2", display: true },
  ]);
  assert.ok(md.includes("`\\(no\\)`"));
  assert.ok(md.includes("```\n$$no$$\n```"));
});

test("Markdown renders with KaTeX, underscores in math stay math", () => {
  const { html, errors } = renderMarkdown("**bold** \\(a_i b_i\\)\n\n$$\n\\sum_i x_i\n$$\n");
  assert.deepEqual(errors, []);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /class="katex"/);
  assert.match(html, /class="katex-display"/);
  assert.ok(!/<em>/.test(html), "no emphasis from math underscores");
  assert.ok(!/<p><span class="katex-display">/.test(html), "a $$ paragraph is not wrapped in <p>");
});

test("broken formulas are errors with the section's line", () => {
  const r = renderArticle(fm("## A {#a}\n\nok \\(\\frac{1}{\\)\n"));
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].line, 5);
  assert.match(r.errors[0].message, /\{#a\}.*公式错误/);
});

test("renderArticle: heading HTML, plain titles, intro", () => {
  const r = renderArticle(fm("Hello.\n\n## Loss \\(\\mathcal{L}\\) and *more* {#loss}\nBody\n"));
  assert.deepEqual(r.errors, []);
  assert.match(r.introHtml, /<p>Hello.<\/p>/);
  assert.match(r.sections[0].headingHtml, /katex/);
  assert.equal(r.sections[0].titleText, "Loss \\mathcal{L} and more");
});

test("article signature changes with structure, not with body text", () => {
  const a = renderArticle(fm("## A {#a}\none\n### S {#a/s}\n"));
  const b = renderArticle(fm("## A {#a}\ntwo, edited\n### S {#a/s}\n"));
  const c = renderArticle(fm("## A {#a}\none\n### S {#a/t}\n"));
  const d = renderArticle(fm("## A {#a}\none\n### S {#a/s}\n", "title: Other\ndate: 2026-01-01"));
  assert.equal(articleSignature(a), articleSignature(b));
  assert.notEqual(articleSignature(a), articleSignature(c));
  assert.notEqual(articleSignature(a), articleSignature(d));
});

// ── Section ↔ frame validation ────────────────────────────────────────

const sections = renderArticle(fm("## A {#a}\n### S {#a/s}\n### T {#a/t}\n## B {#b}\n")).sections;
const frame = (name, x = 0) => ({ name, x, y: 0, w: 10, h: 10 });

test("frames: every section matched → no issues", () => {
  const r = checkFrames(sections, [frame("a"), frame("a/s"), frame("a/t"), frame("b")]);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(Object.keys(r.frameMap), ["a", "a/s", "a/t", "b"]);
});

test("frames: name without a section, bad name, duplicate name → errors", () => {
  const r = checkFrames(sections, [frame("a"), frame("a/s"), frame("a/t"), frame("b"), frame("c"), frame("A b"), frame("b", 50)]);
  const msg = r.errors.map((e) => e.message).join("\n");
  assert.match(msg, /Frame "c" 找不到对应章节/);
  assert.match(msg, /Frame 名 "A b" 格式不对/);
  assert.match(msg, /Frame 名 "b" 在图里出现了不止一次/);
  assert.equal(r.errors.length, 3);
  assert.equal(r.frameMap.b.x, 0, "the first frame with a name wins");
});

test("frames: section without a frame → warning (sub falls back to parent)", () => {
  const r = checkFrames(sections, [frame("a"), frame("a/s")]);
  assert.deepEqual(r.errors, []);
  const w = Object.fromEntries(r.warnings.map((x) => [x.message.match(/\{#([^}]+)\}/)[1], x]));
  assert.deepEqual(Object.keys(w), ["a/t", "b"]);
  assert.match(w["a/t"].message, /停在父章节 "a"/);
  assert.match(w.b.message, /显示全图/);
  assert.equal(w.b.line, sections.find((s) => s.id === "b").line);
});

test("frames: unnamed frames are decoration; boxes are rounded to 0.01", () => {
  const r = checkFrames(sections, [
    { name: null, x: 1, y: 1, w: 1, h: 1 },
    { name: "  ", x: 1, y: 1, w: 1, h: 1 },
    { name: "a", x: 1.23456, y: 2, w: 3, h: 4 },
  ]);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.frameMap, { a: { x: 1.23, y: 2, w: 3, h: 4 } });
});

// ── posts.json sync ───────────────────────────────────────────────────

const blog = [
  { title: "Old blog post", date: "2026-02-28", file: "hello.md" },
  { title: "Stale", date: "2026-01-01", url: "/writeup/gone/" },
  { title: "Old title", date: "2026-03-01", url: "/writeup/kept/", extra: "x" },
  { title: "Another blog post", date: "2026-09-28", file: "cwm.md" },
  { title: "Off-site link", date: "2026-05-05", url: "https://example.com/" },
];

test("posts.json: only /writeup/ entries are added, updated or removed", () => {
  const out = syncPostsJson(blog, [
    { slug: "kept", title: "New title", date: "2026-03-02", description: "d" },
    { slug: "fresh", title: "Fresh", date: "2026-10-29", description: "" },
  ]);
  assert.deepEqual(out, [
    blog[0],
    { title: "New title", date: "2026-03-02", description: "d", url: "/writeup/kept/" },
    blog[3],
    blog[4],
    { title: "Fresh", date: "2026-10-29", url: "/writeup/fresh/" },
  ]);
  // Non-writeup entries are the very same objects, untouched and in order.
  assert.equal(out[0], blog[0]);
  assert.equal(out[2], blog[3]);
  assert.equal(out[3], blog[4]);
});

test("posts.json: sync is idempotent and keeps the file's formatting", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "writeup-"));
  const file = path.join(dir, "posts.json");
  const original = JSON.stringify(blog.slice(0, 1), null, 2) + "\n";
  await writeFile(file, original);

  assert.equal(await updatePostsJsonFile(file, []), false, "nothing to change → not written");
  assert.equal(await readFile(file, "utf8"), original);

  const w = [{ slug: "demo", title: "Demo", date: "2026-10-29", description: "" }];
  assert.equal(await updatePostsJsonFile(file, w), true);
  const once = await readFile(file, "utf8");
  assert.ok(once.startsWith(original.replace(/\n\]\n$/, "")), "existing entries keep their exact text");
  const mtime = (await stat(file)).mtimeMs;
  assert.equal(await updatePostsJsonFile(file, w), false);
  assert.equal((await stat(file)).mtimeMs, mtime);

  assert.equal(await updatePostsJsonFile(file, []), true, "unpublishing removes the entry");
  assert.equal(await readFile(file, "utf8"), original);
});

test("posts.json: refuses a file that is not a JSON array", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "writeup-"));
  const file = path.join(dir, "posts.json");
  await writeFile(file, "{}");
  await assert.rejects(updatePostsJsonFile(file, []), /应该是一个数组/);
  await writeFile(file, "[");
  await assert.rejects(updatePostsJsonFile(file, []), /不是合法的 JSON/);
});

// ── Diagram export (headless Chromium) ────────────────────────────────

test("diagram: unreadable files give clear errors", async () => {
  await assert.rejects(compileDiagram("{"), /不是合法的 JSON/);
  await assert.rejects(compileDiagram("{}"), /没有 elements 数组/);
  await assert.rejects(compileDiagram('{"elements":[{"type":"rectangle","isDeleted":true}]}'), /图是空的/);
});

test("diagram: frame boxes land in SVG coordinates, frames hidden, fonts embedded", async () => {
  const scene = JSON.parse(await readFile(path.join(HERE, "fixtures", "coord-test.excalidraw"), "utf8"));
  const d = await compileDiagram(JSON.stringify(scene));
  // The fixture's left-most element is a root note at x = -560 and the top-most
  // is the "intro" frame at y = -100; export padding is 24.
  assert.deepEqual(d.offset, { x: 584, y: 124 });
  const byName = Object.fromEntries(d.frames.map((f) => [f.name, f]));
  for (const el of scene.elements.filter((e) => e.type === "frame")) {
    assert.deepEqual(byName[el.name], { id: el.id, name: el.name, x: el.x + 584, y: el.y + 124, w: el.width, h: el.height });
  }
  assert.match(d.svg, new RegExp(`viewBox="0 0 ${d.width} ${d.height}"`));
  assert.match(d.svg, /@font-face \{ font-family: Excalifont; src: url\(data:font\/woff2;base64,/);
  assert.match(d.svg, /@font-face \{ font-family: Xiaolai; src: url\(data:font\/woff2;base64,/, "CJK glyphs embedded");
  assert.ok(!d.svg.includes(">intro<") && !d.svg.includes(">model/encoder<"), "frame names are not drawn");
});

test("diagram: the `npm run new` template builds without errors or warnings", async () => {
  const tpl = path.join(HERE, "..", "templates");
  const article = renderArticle((await readFile(path.join(tpl, "article.md"), "utf8")).replace("{{date}}", "2026-01-01"));
  assert.deepEqual(article.errors, []);
  assert.equal(article.meta.draft, true, "new posts start as drafts");
  const d = await compileDiagram(await readFile(path.join(tpl, "diagram.excalidraw"), "utf8"));
  const r = checkFrames(article.sections, d.frames);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});
