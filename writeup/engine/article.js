// Parse + render an article and check it against the diagram's frames.

import { parseArticle, MAIN_ID, SUB_ID } from "./parse.js";
import { renderMarkdown, renderInline, plainTitle, escapeHtml } from "./render.js";

/**
 * @returns {{meta, introHtml: string, sections: {id, level, parent, title,
 *   titleText, line, headingHtml, bodyHtml}[], errors: {line, message}[]}}
 */
export function renderArticle(text) {
  const parsed = parseArticle(text);
  const errors = [...parsed.errors];
  const intro = renderMarkdown(text.slice(parsed.intro.start, parsed.intro.end));
  intro.errors.forEach((e) => errors.push({ line: null, message: `(intro) ${e.message}` }));

  const sections = parsed.sections.map((s) => {
    const heading = renderInline(s.title);
    const body = renderMarkdown(text.slice(s.bodyStart, s.end));
    for (const e of [...heading.errors, ...body.errors]) errors.push({ line: s.line, message: `({#${s.id}}) ${e.message}` });
    return {
      id: s.id,
      level: s.level,
      parent: s.parent,
      title: s.title,
      titleText: plainTitle(s.title),
      line: s.line,
      headingHtml: heading.html,
      bodyHtml: body.html,
    };
  });
  return { meta: parsed.meta, introHtml: intro.html, sections, errors };
}

/**
 * Cross-check sections and frames.
 * @param sections from renderArticle
 * @param frames [{name, x, y, w, h}] from the exporter
 * @returns {{errors: {message}[], warnings: {line, message}[], frameMap: Record<string, {x,y,w,h}>}}
 */
export function checkFrames(sections, frames) {
  const errors = [];
  const warnings = [];
  const ids = new Set(sections.map((s) => s.id));
  const frameMap = {};
  for (const f of frames) {
    const name = (f.name ?? "").trim();
    if (!name) continue; // unnamed frames are just decoration
    if (frameMap[name]) {
      errors.push({ message: `Frame name "${name}" is used more than once in the diagram` });
      continue;
    }
    if (!MAIN_ID.test(name) && !SUB_ID.test(name)) {
      errors.push({ message: `Frame name "${name}" is not a valid section id (e.g. encoder or encoder/attention)` });
      continue;
    }
    if (!ids.has(name)) {
      errors.push({ message: `Frame "${name}" has no matching section: article.md has no {#${name}}` });
      continue;
    }
    frameMap[name] = { x: round(f.x), y: round(f.y), w: round(f.w), h: round(f.h) };
  }
  for (const s of sections) {
    if (!frameMap[s.id]) {
      const fallback =
        s.parent && frameMap[s.parent] ? `the camera will stay on the parent section "${s.parent}"` : "the camera will show the whole diagram";
      warnings.push({ line: s.line, message: `Section {#${s.id}} has no Frame with the same name; ${fallback}` });
    }
  }
  return { errors, warnings, frameMap };
}

const round = (v) => Math.round(v * 100) / 100;

/** Structure signature: if this changes, the page needs a full article swap. */
export function articleSignature(article) {
  return JSON.stringify([article.meta, article.introHtml === "", article.sections.map((s) => [s.id, s.level])]);
}

export function sectionsData(article) {
  return article.sections.map((s) => ({ id: s.id, parent: s.parent, title: s.titleText }));
}

export function articleHtml(article) {
  const { meta, introHtml, sections } = article;
  const parts = [];
  parts.push(`<header class="wu-head">
  <h1 class="wu-title">${escapeHtml(meta.title)}</h1>
  <p class="wu-meta">${escapeHtml(formatDate(meta.date))}</p>
  ${meta.description ? `<p class="wu-desc">${escapeHtml(meta.description)}</p>` : ""}
</header>`);
  if (introHtml) parts.push(`<div class="wu-intro wu-body">${introHtml}</div>`);
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.level !== 2) continue;
    const subs = [];
    while (sections[i + 1]?.level === 3) subs.push(sections[++i]);
    parts.push(`<section class="wu-sec" id="${escapeHtml(s.id)}" data-id="${escapeHtml(s.id)}">
  <h2 class="wu-h">${s.headingHtml}</h2>
  <div class="wu-body">${s.bodyHtml}</div>${
    subs.length
      ? `\n  <nav class="wu-chips" aria-label="Components">${subs
          .map((c) => `<a class="wu-chip" href="#${escapeHtml(c.id)}" data-target="${escapeHtml(c.id)}">${c.headingHtml}</a>`)
          .join("")}</nav>
  <div class="wu-subs">${subs
    .map(
      (c) => `
    <details class="wu-sub" id="${escapeHtml(c.id)}" data-id="${escapeHtml(c.id)}">
      <summary><h3 class="wu-h">${c.headingHtml}</h3></summary>
      <div class="wu-body">${c.bodyHtml}</div>
    </details>`
    )
    .join("")}
  </div>`
      : ""
  }
</section>`);
  }
  return parts.join("\n");
}

export function tocHtml(article) {
  const out = [];
  const { sections } = article;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.level !== 2) continue;
    const subs = [];
    while (sections[i + 1]?.level === 3) subs.push(sections[++i]);
    const link = (x) => `<a href="#${escapeHtml(x.id)}" data-id="${escapeHtml(x.id)}">${x.headingHtml}</a>`;
    out.push(`<li>${link(s)}${subs.length ? `<ol>${subs.map((c) => `<li>${link(c)}</li>`).join("")}</ol>` : ""}</li>`);
  }
  return `<ol>${out.join("")}</ol>`;
}

export function formatDate(str) {
  const d = new Date(str + "T12:00:00");
  return isNaN(d) ? str : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
