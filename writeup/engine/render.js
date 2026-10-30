// Markdown + KaTeX → HTML, done at build time so the page ships no Markdown
// or KaTeX JavaScript. Same math syntax as blog/: $$...$$ is display math,
// \(...\) inline. Math is lifted out before marked runs (so `_` and `\` inside
// it are left alone), except inside code blocks and code spans.

import { Marked } from "marked";
import katex from "katex";

const marked = new Marked({ gfm: true });
const FENCE = /^[ \t]*(`{3,}|~{3,})/;

export const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Replace math with @@MATHn@@ placeholders, leaving code untouched. */
export function protectMath(md) {
  const math = [];
  let out = "";
  let i = 0;
  const atLineStart = () => i === 0 || md[i - 1] === "\n";
  while (i < md.length) {
    if (atLineStart()) {
      const lineEnd = md.indexOf("\n", i) === -1 ? md.length : md.indexOf("\n", i) + 1;
      const f = FENCE.exec(md.slice(i, lineEnd));
      if (f) {
        // Copy the whole fenced block verbatim.
        let j = lineEnd;
        while (j < md.length) {
          const e = md.indexOf("\n", j) === -1 ? md.length : md.indexOf("\n", j) + 1;
          const line = md.slice(j, e).trim();
          j = e;
          if (line.startsWith(f[1][0].repeat(f[1].length)) && /^(`+|~+)$/.test(line)) break;
        }
        out += md.slice(i, j);
        i = j;
        continue;
      }
    }
    const c = md[i];
    if (c === "`") {
      let n = 1;
      while (md[i + n] === "`") n++;
      const run = "`".repeat(n);
      let close = md.indexOf(run, i + n);
      while (close !== -1 && md[close + n] === "`") close = md.indexOf(run, close + n + 1);
      const end = close === -1 ? i + n : close + n;
      out += md.slice(i, end);
      i = end;
      continue;
    }
    if (c === "$" && md[i + 1] === "$") {
      const close = md.indexOf("$$", i + 2);
      if (close !== -1) {
        math.push({ tex: md.slice(i + 2, close), display: true });
        out += `@@MATH${math.length - 1}@@`;
        i = close + 2;
        continue;
      }
    }
    if (c === "\\" && md[i + 1] === "(") {
      const close = md.indexOf("\\)", i + 2);
      if (close !== -1) {
        math.push({ tex: md.slice(i + 2, close), display: false });
        out += `@@MATH${math.length - 1}@@`;
        i = close + 2;
        continue;
      }
    }
    if (c === "\\" && i + 1 < md.length) {
      out += md.slice(i, i + 2);
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return { md: out, math };
}

function renderMath(math, errors) {
  return math.map(({ tex, display }) => {
    try {
      return katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: "ignore", output: "htmlAndMathml" });
    } catch (e) {
      errors.push({
        message: `Math error: ${e.message.replace(/^KaTeX parse error: /, "")}  ←  ${display ? "$$" : "\\("}${tex.trim()}${display ? "$$" : "\\)"}`,
      });
      return `<code class="wu-math-error" title="${escapeHtml(e.message)}">${escapeHtml(tex)}</code>`;
    }
  });
}

function restore(html, rendered, math) {
  return html.replace(/<p>@@MATH(\d+)@@<\/p>/g, (m, i) => (math[i]?.display ? rendered[i] : m)).replace(/@@MATH(\d+)@@/g, (m, i) => rendered[i] ?? m);
}

/** Render a Markdown block. Returns { html, errors }. */
export function renderMarkdown(md) {
  const errors = [];
  const { md: safe, math } = protectMath(md);
  const rendered = renderMath(math, errors);
  return { html: restore(marked.parse(safe), rendered, math).trim(), errors };
}

/** Render a heading title (inline Markdown and inline math). */
export function renderInline(md) {
  const errors = [];
  const { md: safe, math } = protectMath(md);
  const rendered = renderMath(math, errors);
  return { html: restore(marked.parseInline(safe), rendered, math), errors };
}

/** Plain text of a title for tooltips and <title>: strips Markdown marks. */
export function plainTitle(md) {
  return md
    .replace(/\\\((.*?)\\\)|\$\$(.*?)\$\$/g, (_, a, b) => a ?? b)
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
}
