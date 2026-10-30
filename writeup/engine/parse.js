// article.md → front matter + sections with exact source ranges.
//
// Sections are delimited by `## Title {#id}` and `### Title {#parent/child}`
// headings. Lines inside fenced code, $$ math blocks and HTML comments are
// never headings. Every range is a [start, end) character offset into the
// original text, so a section can be rewritten without touching any other
// byte of the file.

import YAML from "yaml";

const SEGMENT = "[a-z0-9]+(?:-[a-z0-9]+)*";
export const MAIN_ID = new RegExp(`^${SEGMENT}$`);
export const SUB_ID = new RegExp(`^${SEGMENT}/${SEGMENT}$`);

const HEADING = /^ {0,3}(#{2,3})(?=[ \t]|$)(.*)$/;
const ID_SUFFIX = /[ \t]+\{#([^}]*)\}[ \t]*$|^\{#([^}]*)\}[ \t]*$/;
const FENCE = /^[ \t]*(`{3,}|~{3,})/;

/** Split text into lines that keep their terminators, with offsets. */
function lines(text, from = 0) {
  const out = [];
  let pos = from;
  let n = 0;
  while (pos < text.length) {
    let end = text.indexOf("\n", pos);
    end = end === -1 ? text.length : end + 1;
    out.push({ start: pos, end, text: text.slice(pos, end).replace(/\r?\n$/, ""), n: n++ });
    pos = end;
  }
  return out;
}

function lineNumberAt(text, offset) {
  let n = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < offset; i = text.indexOf("\n", i + 1)) n++;
  return n;
}

export function splitFrontMatter(text) {
  const errors = [];
  const bom = text.startsWith("﻿") ? 1 : 0;
  const m = /^---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(text.slice(bom));
  if (!m || m.index !== 0) {
    errors.push({ line: 1, message: "Missing the YAML front matter at the top (title / date between --- lines)" });
    return { data: {}, bodyStart: bom, errors };
  }
  let data = {};
  try {
    data = YAML.parse(m[1]) ?? {};
    if (typeof data !== "object" || Array.isArray(data)) throw new Error("front matter must be key: value pairs");
  } catch (e) {
    errors.push({ line: 2, message: `front matter is not valid YAML: ${e.message.split("\n")[0]}` });
    data = {};
  }
  return { data, bodyStart: bom + m[0].length, errors };
}

function checkMeta(data, errors) {
  const meta = {
    title: data.title == null ? "" : String(data.title),
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date == null ? "" : String(data.date),
    description: data.description == null ? "" : String(data.description),
    draft: data.draft === true,
  };
  if (!meta.title) errors.push({ line: 1, message: "front matter is missing title" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) errors.push({ line: 1, message: `front matter date must be YYYY-MM-DD (got "${meta.date}")` });
  if (data.draft != null && typeof data.draft !== "boolean") errors.push({ line: 1, message: "front matter draft must be true or false" });
  return meta;
}

/**
 * Find the line indices of section headings, skipping code fences,
 * $$ blocks and HTML comments.
 */
function scanHeadings(ls) {
  const found = [];
  let fence = null; // { char, len }
  let inMath = false;
  let inComment = false;
  for (const l of ls) {
    const t = l.text;
    if (fence) {
      const m = FENCE.exec(t);
      if (m && m[1][0] === fence.char && m[1].length >= fence.len && t.trim() === m[1]) fence = null;
      continue;
    }
    if (inComment) {
      if (t.includes("-->")) inComment = false;
      continue;
    }
    if (inMath) {
      if ((t.match(/\$\$/g) || []).length % 2 === 1) inMath = false;
      continue;
    }
    const f = FENCE.exec(t);
    if (f) {
      fence = { char: f[1][0], len: f[1].length };
      continue;
    }
    if (/^[ \t]*<!--/.test(t) && !t.includes("-->")) {
      inComment = true;
      continue;
    }
    const h = HEADING.exec(t);
    if (h) {
      found.push({ line: l, level: h[1].length, rest: h[2] });
      continue;
    }
    if ((t.match(/\$\$/g) || []).length % 2 === 1) inMath = true;
  }
  return found;
}

/**
 * Parse article.md.
 * @returns {{
 *   meta: {title: string, date: string, description: string, draft: boolean},
 *   intro: {start: number, end: number},
 *   sections: {id: string, level: 2|3, parent: string|null, title: string,
 *              line: number, start: number, bodyStart: number, end: number}[],
 *   errors: {line: number, message: string}[]
 * }}
 * `start` is the heading line, `bodyStart` the line after it, `end` the next
 * heading (of either level) or end of file — a main section's own range
 * stops at its first sub-section.
 */
export function parseArticle(text) {
  const fm = splitFrontMatter(text);
  const errors = [...fm.errors];
  const meta = checkMeta(fm.data, errors);
  const ls = lines(text, fm.bodyStart);
  const lineNo = (l) => lineNumberAt(text, l.start);

  const sections = [];
  const seen = new Map();
  let parent = null;
  for (const h of scanHeadings(ls)) {
    const line = lineNo(h.line);
    const m = ID_SUFFIX.exec(h.rest);
    const tag = "#".repeat(h.level);
    if (!m) {
      errors.push({ line, message: `${tag} heading is missing {#id}: "${h.line.text.trim()}"` });
      continue;
    }
    const id = (m[1] ?? m[2]).trim();
    const title = h.rest.slice(0, m.index).trim();
    if (h.level === 2) {
      if (!MAIN_ID.test(id)) {
        errors.push({ line, message: `Section id "${id}" is not valid: use lowercase letters, digits and hyphens, e.g. {#data-flow}` });
      }
      parent = id;
    } else {
      if (!SUB_ID.test(id)) {
        errors.push({ line, message: `Component id "${id}" is not valid: write it as {#parent/child}, e.g. {#${parent ?? "encoder"}/attention}` });
      } else if (parent === null) {
        errors.push({ line, message: `### {#${id}} comes before the first ## section` });
      } else if (id.split("/")[0] !== parent) {
        errors.push({ line, message: `### {#${id}} should use its section "${parent}" as the parent id` });
      }
    }
    if (seen.has(id)) {
      errors.push({ line, message: `Section id "${id}" is used more than once (first on line ${seen.get(id)})` });
    } else {
      seen.set(id, line);
    }
    sections.push({
      id,
      level: h.level,
      parent: h.level === 3 ? parent : null,
      title,
      line,
      start: h.line.start,
      bodyStart: h.line.end,
      end: text.length,
    });
  }
  for (let i = 0; i < sections.length - 1; i++) sections[i].end = sections[i + 1].start;

  const intro = { start: fm.bodyStart, end: sections.length ? sections[0].start : text.length };
  return { meta, intro, sections, errors };
}

/** Editable source of one section: its heading and body, minus trailing blank lines. */
export function sectionSource(text, section) {
  return text.slice(section.start, section.end).replace(/\s+$/, "") + "\n";
}

/**
 * Replace one section's source in the article. Only the bytes of that
 * section's own range change; the blank lines that separated it from the
 * next heading are kept as they were.
 */
export function replaceSection(text, id, newSource) {
  const { sections } = parseArticle(text);
  const matches = sections.filter((s) => s.id === id);
  if (matches.length !== 1) {
    throw new Error(
      matches.length ? `Section id "${id}" is used more than once, so there is no single place to write back` : `Section "${id}" not found`
    );
  }
  const s = matches[0];
  const old = text.slice(s.start, s.end);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let trailing = old.slice(old.replace(/\s+$/, "").length);
  if (s.end < text.length && !trailing.includes("\n")) trailing += eol;
  let body = newSource.replace(/\s+$/, "");
  if (eol === "\r\n") body = body.replace(/\r?\n/g, "\r\n");
  return text.slice(0, s.start) + body + trailing + text.slice(s.end);
}
