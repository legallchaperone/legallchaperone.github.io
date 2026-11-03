// Code cards: fenced blocks that leave the article and stack up under the
// diagram, one per section.
//
//   ```python file=model.py lines=12-30,44-51 focus=20-22
//   ```
//
// `file=` reads real lines (with their real numbers) from a file, relative to
// the post folder. Without `file=`, the word `panel` sends the block's own
// body to the card instead (`title=`, `start=` optional). Everything is
// highlighted at build time with Shiki, so the page ships no highlighter.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHighlighter, bundledLanguages } from "shiki";

import { escapeHtml } from "./render.js";

const FENCE_OPEN = /^[ \t]*(`{3,}|~{3,})(.*)$/;
const PLAIN = new Set(["", "text", "txt", "plain", "plaintext", "tree"]);
const THEMES = { light: "vitesse-light", dark: "vitesse-dark" };

/** `python file=a.py lines=1-3 focus=2` → {lang, attrs, panel} */
export function parseInfo(info) {
  const attrs = {};
  let lang = "";
  let panel = false;
  for (const m of info.matchAll(/(\w+)=("([^"]*)"|'([^']*)'|\S+)|(\S+)/g)) {
    if (m[1]) attrs[m[1]] = m[3] ?? m[4] ?? m[2];
    else if (m[5] === "panel") panel = true;
    else if (!lang) lang = m[5];
  }
  return { lang, attrs, panel: panel || "file" in attrs };
}

/**
 * Pull card fences out of a Markdown slice.
 * @returns {{md: string, specs: {offset: number, lang: string, attrs: object, body: string}[]}}
 * `offset` is where the fence started in the slice; `md` is the slice without card fences.
 */
export function extractCards(md) {
  const specs = [];
  let out = "";
  let i = 0;
  while (i < md.length) {
    const lineEnd = md.indexOf("\n", i) === -1 ? md.length : md.indexOf("\n", i) + 1;
    const line = md.slice(i, lineEnd).replace(/\r?\n$/, "");
    const f = FENCE_OPEN.exec(line);
    if (!f) {
      out += md.slice(i, lineEnd);
      i = lineEnd;
      continue;
    }
    // Find the closing fence: same character, at least as long, nothing else on the line.
    const closer = new RegExp(`^[ \\t]*${f[1][0] === "`" ? "`" : "~"}{${f[1].length},}[ \\t]*$`);
    let j = lineEnd;
    let bodyEnd = md.length;
    while (j < md.length) {
      const e = md.indexOf("\n", j) === -1 ? md.length : md.indexOf("\n", j) + 1;
      if (closer.test(md.slice(j, e).replace(/\r?\n$/, ""))) {
        bodyEnd = j;
        j = e;
        break;
      }
      j = e;
      bodyEnd = j;
    }
    const info = parseInfo(f[2].trim());
    if (info.panel) {
      specs.push({ offset: i, lang: info.lang, attrs: info.attrs, body: md.slice(lineEnd, bodyEnd) });
    } else {
      out += md.slice(i, j);
    }
    i = j;
  }
  return { md: out, specs };
}

/** "12-30,44" → [[12,30],[44,44]] sorted and merged; throws on bad input. */
export function parseRanges(spec, what) {
  const ranges = [];
  for (const part of String(spec).split(",")) {
    const m = /^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/.exec(part);
    if (!m) throw new Error(`${what}="${spec}" is not a list of line ranges like 12-30,44`);
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[1]);
    if (a < 1 || b < a) throw new Error(`${what}="${spec}": "${part.trim()}" is not a valid range`);
    ranges.push([a, b]);
  }
  ranges.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

const inRanges = (n, ranges) => ranges.some(([a, b]) => n >= a && n <= b);

let highlighter = null;
async function getHighlighter() {
  highlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: [] });
  return highlighter;
}

function langFor(lang, file) {
  const l = (lang || (file ? path.extname(file).slice(1) : "")).toLowerCase();
  if (PLAIN.has(l)) return { lang: null };
  if (l in bundledLanguages) return { lang: l };
  return { lang: null, unknown: l };
}

/** One HTML string per source line, highlighted as a whole file so multi-line strings stay right. */
async function highlightLines(source, lang) {
  const lines = source.split(/\r?\n/);
  if (!lang) return lines.map((l) => escapeHtml(l));
  const h = await getHighlighter();
  if (!h.getLoadedLanguages().includes(lang)) await h.loadLanguage(lang);
  const { tokens } = h.codeToTokens(source, { lang, themes: THEMES, defaultColor: false });
  return tokens.map((line) =>
    line
      .map((t) => {
        const style = Object.entries(t.htmlStyle ?? {})
          .map(([k, v]) => `${k}:${v}`)
          .join(";");
        return style ? `<span style="${escapeHtml(style)}">${escapeHtml(t.content)}</span>` : escapeHtml(t.content);
      })
      .join("")
  );
}

const fmtRanges = (ranges) => ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ");

/**
 * Read, cut and highlight one card.
 * @returns {{card?: object, errors: string[], warnings: string[], file?: string}}
 */
export async function loadCard(spec, dir) {
  const errors = [];
  const warnings = [];
  const { attrs, body } = spec;
  let source;
  let first = 1;
  let file = null;
  if (attrs.file) {
    if (body.trim()) errors.push("use either file= or a code body, not both");
    file = path.resolve(dir, attrs.file);
    source = await readFile(file, "utf8").catch(() => null);
    if (source === null) return { errors: [...errors, `file=${attrs.file}: file not found`], warnings, file };
  } else {
    source = body.replace(/\r?\n$/, "");
    if (attrs.start != null) {
      first = Number(attrs.start);
      if (!Number.isInteger(first) || first < 1) errors.push(`start="${attrs.start}" must be a whole number ≥ 1`);
    }
  }
  source = source.replace(/\r?\n$/, "");
  const total = source.split(/\r?\n/).length;
  const last = first + total - 1;

  let ranges = [[first, last]];
  let focus = [];
  try {
    if (attrs.lines != null) {
      ranges = parseRanges(attrs.lines, "lines");
      const bad = ranges.find(([a, b]) => a < first || b > last);
      if (bad) throw new Error(`lines="${attrs.lines}" goes past the ${attrs.file ? "file" : "snippet"} (lines ${first}–${last})`);
    }
    if (attrs.focus != null) focus = parseRanges(attrs.focus, "focus");
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) return { errors, warnings, file };
  if (focus.some(([a, b]) => !inRanges(a, ranges) || !inRanges(b, ranges))) {
    warnings.push(`focus="${attrs.focus}" includes lines the card does not show`);
  }

  const { lang, unknown } = langFor(spec.lang, attrs.file);
  if (unknown) warnings.push(`no highlighting for "${unknown}"; the card is shown as plain text`);
  const html = await highlightLines(source, lang);

  const rows = [];
  ranges.forEach(([a, b], k) => {
    if (k > 0) rows.push(`<span class="ln is-gap"><span class="gutter">⋯</span><span class="src"></span></span>`);
    for (let n = a; n <= b; n++) {
      const cls = inRanges(n, focus) ? "ln is-focus" : "ln";
      rows.push(`<span class="${cls}"><span class="gutter">${n}</span><span class="src">${html[n - first] || " "}</span></span>`);
    }
  });
  const whole = ranges.length === 1 && ranges[0][0] === first && ranges[0][1] === last && attrs.lines == null;
  const meta = whole ? (attrs.file ? `${total} line${total === 1 ? "" : "s"}` : "") : `lines ${fmtRanges(ranges)}`;
  const title = attrs.title ?? attrs.file ?? (spec.lang || "code");
  const numbered = attrs.file != null || attrs.start != null || attrs.lines != null;
  return { card: { title, meta, numbered, rows }, errors, warnings, file };
}

/**
 * Load every card in an article.
 * @returns {{cards: {id, title, meta, html}[], errors: {line, message}[], warnings: {line, message}[], files: string[]}}
 */
export async function loadCards(article, dir) {
  const cards = [];
  const errors = [];
  const warnings = [];
  const files = [];
  const owners = [{ id: "", card: article.introCard }, ...article.sections.map((s) => ({ id: s.id, card: s.card }))];
  for (const { id, card: spec } of owners) {
    if (!spec) continue;
    const r = await loadCard(spec, dir);
    if (r.file) files.push(r.file);
    for (const m of r.errors) errors.push({ line: spec.line, message: `code card: ${m}` });
    for (const m of r.warnings) warnings.push({ line: spec.line, message: `code card: ${m}` });
    if (r.card) cards.push({ id, ...r.card });
  }
  return { cards, errors, warnings, files };
}

export function cardsHtml(cards) {
  return cards
    .map(
      (c) => `
      <article class="wu-card" data-for="${escapeHtml(c.id)}">
        <header class="wu-card-head"><span class="wu-card-title">${escapeHtml(c.title)}</span><span class="wu-card-meta">${escapeHtml(c.meta)}</span></header>
        <div class="wu-card-body"><pre class="wu-code${c.numbered ? "" : " is-plain"}"><code>${c.rows.join("")}</code></pre></div>
      </article>`
    )
    .join("");
}
