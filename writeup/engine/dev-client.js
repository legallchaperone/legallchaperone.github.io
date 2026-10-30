// Loaded only by `npm run dev`: live updates over SSE, the build error bar,
// and per-section editing that writes back to article.md.

const shell = document.body.hasAttribute("data-shell");
const viewer = shell ? null : (await import(new URL("viewer.js", location.href).href)).viewer;

const style = document.createElement("style");
style.textContent = `
.wu-dev-bar { position: fixed; left: 0; right: 0; top: var(--top-h, 52px); z-index: 40; font: 500 0.78rem/1.5 var(--font-head, sans-serif);
  padding: 0.55rem 1.25rem; max-height: 40vh; overflow: auto; box-shadow: 0 6px 18px rgba(20,20,19,.12); }
.wu-dev-bar.is-error { background: #fbe9e5; color: #8a2b14; border-bottom: 1px solid #e8b4a6; }
.wu-dev-bar.is-warn { background: #fdf6e3; color: #7a5a12; border-bottom: 1px solid #ecd9a6; }
.wu-dev-bar ul { list-style: none; margin-top: 0.25rem; }
.wu-dev-bar li { font: 0.76rem/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; }
.wu-dev-bar button { float: right; font: inherit; background: none; border: 0; color: inherit; cursor: pointer; opacity: .7; }
.wu-sec { position: relative; }
.wu-edit-btn { font: 500 0.68rem/1 var(--font-head, sans-serif); color: var(--muted); background: var(--surface); border: 1px solid var(--rule);
  border-radius: 999px; padding: 0.3rem 0.6rem; cursor: pointer; opacity: 0; transition: opacity .15s ease; }
.wu-sec > .wu-edit-btn { position: absolute; right: 0; top: 0.3rem; }
.wu-sub > summary .wu-edit-btn { margin-left: auto; }
.wu-sec:hover > .wu-edit-btn, .wu-sub > summary:hover .wu-edit-btn, .wu-edit-btn:focus-visible { opacity: 1; }
.wu-edit-btn:hover { color: var(--accent); border-color: var(--accent); }
.is-editing > .wu-body { display: none; }
.wu-text { container-type: inline-size; }
.wu-ed { width: 100cqw; margin: 0.5rem 0 1.5rem calc(50% - 50cqw); background: var(--surface); border: 1px solid var(--accent);
  border-radius: 10px; box-shadow: 0 10px 30px rgba(20,20,19,.1); font-size: 16px; }
.wu-ed-bar { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--rule);
  font: 500 0.75rem/1.4 var(--font-head, sans-serif); }
.wu-ed-bar code { font-size: 0.72rem; color: var(--accent); }
.wu-ed-status { color: var(--muted); margin-right: auto; }
.wu-ed-status.is-bad { color: #b33a1a; }
.wu-ed-bar button, .wu-ed-conflict button { font: inherit; border: 1px solid var(--rule); background: var(--bg); border-radius: 6px;
  padding: 0.3rem 0.65rem; cursor: pointer; }
.wu-ed-bar button[data-act=save] { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.wu-ed-conflict { padding: 0.6rem 0.75rem; background: #fbe9e5; color: #8a2b14; font: 0.78rem/1.5 var(--font-head, sans-serif);
  display: flex; gap: 0.75rem; align-items: center; }
.wu-ed-conflict[hidden] { display: none; }
.wu-ed-panes { display: grid; grid-template-columns: 1fr; }
.wu-ed textarea { width: 100%; min-height: 18rem; height: 45vh; resize: vertical; border: 0; outline: none; padding: 0.9rem 1rem;
  font: 13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--fg); background: var(--bg); tab-size: 2; }
.wu-ed-preview { padding: 0.9rem 1.25rem; overflow: auto; max-height: 45vh; border-top: 1px solid var(--rule); }
.wu-ed-preview .wu-h { font-family: var(--font-head); font-weight: 600; font-size: 1.15rem; margin-bottom: 0.8rem; }
.wu-ed-errors { color: #b33a1a; font: 0.75rem/1.5 ui-monospace, monospace; padding: 0 1.25rem 0.75rem; white-space: pre-wrap; }
@container (min-width: 760px) {
  .wu-ed-panes { grid-template-columns: 1fr 1fr; }
  .wu-ed textarea { height: 60vh; }
  .wu-ed-preview { max-height: none; height: 60vh; border-top: 0; border-left: 1px solid var(--rule); }
}`;
document.head.append(style);

// ── Error bar ─────────────────────────────────────────────────────────

const bar = document.createElement("div");
bar.className = "wu-dev-bar";
bar.hidden = true;
document.body.append(bar);
let warningsDismissed = "";

const fmt = (i) => `${i.file}${i.line ? `:${i.line}` : ""}  ${i.message}`;
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function showStatus({ errors = [], warnings = [] }) {
  const key = JSON.stringify(warnings);
  if (errors.length) {
    bar.className = "wu-dev-bar is-error";
    bar.innerHTML = `Build error${errors.length === 1 ? "" : "s"} (${errors.length}). Everything that renders has been updated; this bar goes away once it is fixed.<ul>${errors
      .map((e) => `<li>${escapeHtml(fmt(e))}</li>`)
      .join("")}</ul>`;
    bar.hidden = false;
  } else if (warnings.length && warningsDismissed !== key) {
    bar.className = "wu-dev-bar is-warn";
    bar.innerHTML = `<button type="button" aria-label="Dismiss">✕</button>${warnings.length} warning${warnings.length === 1 ? "" : "s"}<ul>${warnings
      .map((w) => `<li>${escapeHtml(fmt(w))}</li>`)
      .join("")}</ul>`;
    bar.querySelector("button").onclick = () => {
      warningsDismissed = key;
      bar.hidden = true;
    };
    bar.hidden = false;
  } else {
    bar.hidden = true;
  }
}

// ── Live updates ──────────────────────────────────────────────────────

let boot = null;
let latestHash = null;
const es = new EventSource("/__dev/events");
const on = (ev, fn) => es.addEventListener(ev, (e) => fn(JSON.parse(e.data)));

on("hello", (d) => {
  if (boot && boot !== d.boot) location.reload(); // server restarted
  boot = d.boot;
  latestHash = d.hash;
  if (shell && d.ready) location.reload();
  showStatus(d);
  checkConflicts();
});
on("status", (d) => {
  if (shell && d.ready) location.reload();
  showStatus(d);
});
on("file", (d) => {
  latestHash = d.hash;
  checkConflicts();
});
on("reload", () => location.reload());
on("sections", ({ changes }) => {
  for (const c of changes) {
    const el = c.id ? document.getElementById(c.id) : document.querySelector(".wu-intro");
    if (!el) continue;
    if (c.heading != null) {
      const h = el.querySelector(":scope > .wu-h, :scope > summary > .wu-h");
      if (h) h.innerHTML = c.heading;
      // Component chips and contents links repeat the heading.
      for (const a of document.querySelectorAll(`.wu-chip[data-target="${CSS.escape(c.id)}"], .wu-toc-list a[data-id="${CSS.escape(c.id)}"]`)) {
        a.innerHTML = c.heading;
      }
    }
    const b = el.querySelector(":scope > .wu-body") || (el.matches(".wu-body") ? el : null);
    if (b) b.innerHTML = c.body;
  }
  viewer?.refresh();
});
on("article", ({ html, toc, sections }) => {
  for (const ed of editors.values()) ed.root.remove();
  viewer?.replaceArticle(html, toc, sections);
  decorate();
  for (const ed of [...editors.values()]) {
    if (!attach(ed)) {
      editors.delete(ed.id);
      alert(`Section {#${ed.id}} is no longer in the article, so its editor was closed.`);
    }
  }
  viewer?.refresh();
});
on("diagram", ({ svg, frames, width, height }) => {
  viewer?.replaceDiagram(svg ?? document.querySelector(".wu-drawing").innerHTML, { frames, width, height });
});

// ── Section editor ────────────────────────────────────────────────────

const editors = new Map(); // section id → editor

function decorate() {
  for (const h of document.querySelectorAll(".wu-sec > .wu-h, .wu-sub > summary > .wu-h")) {
    const host = h.parentElement;
    if (host.querySelector(":scope > .wu-edit-btn")) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wu-edit-btn";
    btn.textContent = "Edit";
    h.after(btn);
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".wu-edit-btn");
  if (!btn) return;
  e.preventDefault(); // inside <summary>, don't toggle
  e.stopPropagation();
  const id = btn.closest(".wu-sec, .wu-sub").dataset.id;
  if (editors.has(id)) editors.get(id).textarea.focus();
  else openEditor(id);
});

async function fetchSection(id) {
  const r = await fetch(`/__dev/section?id=${encodeURIComponent(id)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j;
}

function attach(ed) {
  const el = document.getElementById(ed.id);
  if (!el) return false;
  if (el.matches(".wu-sub")) {
    el.open = true;
    el.querySelector(":scope > summary").after(ed.root);
  } else {
    el.querySelector(":scope > .wu-edit-btn, :scope > .wu-h").after(ed.root);
  }
  el.classList.add("is-editing");
  return true;
}

async function openEditor(id) {
  let src;
  try {
    src = await fetchSection(id);
  } catch (e) {
    alert(e.message);
    return;
  }
  const root = document.createElement("div");
  root.className = "wu-ed";
  root.innerHTML = `
    <div class="wu-ed-bar"><code></code><span class="wu-ed-status"></span>
      <button type="button" data-act="save">Save ⌘S</button><button type="button" data-act="close">Close</button></div>
    <div class="wu-ed-conflict" hidden><span>article.md was changed elsewhere while you were editing. Saving is blocked so those changes are not overwritten.</span>
      <button type="button" data-act="reload">Load latest (discard edits here)</button></div>
    <div class="wu-ed-panes"><textarea spellcheck="false"></textarea><div><div class="wu-ed-preview wu-body"></div><div class="wu-ed-errors"></div></div></div>`;
  const ed = {
    id,
    root,
    hash: src.hash,
    saved: src.source,
    saving: false,
    textarea: root.querySelector("textarea"),
    preview: root.querySelector(".wu-ed-preview"),
    errorsEl: root.querySelector(".wu-ed-errors"),
    statusEl: root.querySelector(".wu-ed-status"),
    conflictEl: root.querySelector(".wu-ed-conflict"),
    label: root.querySelector("code"),
  };
  ed.label.textContent = `{#${id}}`;
  ed.textarea.value = src.source;
  editors.set(id, ed);
  attach(ed);
  renderPreview(ed);
  checkConflict(ed);

  let t = 0;
  ed.textarea.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => renderPreview(ed), 120);
    setStatus(ed, ed.textarea.value === ed.saved ? "" : "Unsaved");
  });
  root.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save(ed);
    }
  });
  root.addEventListener("click", (e) => {
    const act = e.target.closest("button[data-act]")?.dataset.act;
    if (act === "save") save(ed);
    if (act === "close") close(ed);
    if (act === "reload") reload(ed);
  });
  ed.textarea.focus();
  viewer?.refresh();
}

function setStatus(ed, text, bad = false) {
  ed.statusEl.textContent = text;
  ed.statusEl.classList.toggle("is-bad", bad);
}

async function renderPreview(ed) {
  const r = await fetch("/__dev/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ markdown: ed.textarea.value }),
  });
  const { html, errors } = await r.json();
  ed.preview.innerHTML = html;
  ed.errorsEl.textContent = errors.join("\n");
}

async function save(ed) {
  if (ed.saving) return;
  ed.saving = true;
  setStatus(ed, "Saving…");
  try {
    const r = await fetch("/__dev/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: ed.id, source: ed.textarea.value, hash: ed.hash }),
    });
    const j = await r.json();
    if (r.status === 409) {
      ed.conflictEl.hidden = false;
      setStatus(ed, "Not saved: conflict", true);
      return;
    }
    if (!r.ok) {
      setStatus(ed, `Not saved: ${j.error}`, true);
      return;
    }
    ed.hash = j.hash;
    ed.saved = ed.textarea.value;
    if (j.id !== ed.id) {
      editors.delete(ed.id);
      ed.id = j.id;
      ed.label.textContent = `{#${j.id}}`;
      editors.set(j.id, ed);
    }
    setStatus(ed, "Saved");
  } catch (e) {
    setStatus(ed, `Not saved: ${e.message}`, true);
  } finally {
    ed.saving = false;
    checkConflict(ed);
  }
}

function checkConflict(ed) {
  if (ed.saving || latestHash == null) return;
  ed.conflictEl.hidden = ed.hash === latestHash;
}
function checkConflicts() {
  for (const ed of editors.values()) checkConflict(ed);
}

async function reload(ed) {
  if (ed.textarea.value !== ed.saved && !confirm("Discard your unsaved edits and load the latest version of this section from article.md?")) return;
  try {
    const src = await fetchSection(ed.id);
    ed.hash = src.hash;
    ed.saved = ed.textarea.value = src.source;
    setStatus(ed, "Loaded latest");
    renderPreview(ed);
    checkConflict(ed);
  } catch (e) {
    setStatus(ed, e.message, true);
  }
}

function close(ed) {
  if (ed.textarea.value !== ed.saved && !confirm("Close the editor? Unsaved edits will be lost.")) return;
  ed.root.remove();
  document.getElementById(ed.id)?.classList.remove("is-editing");
  editors.delete(ed.id);
  viewer?.refresh();
}

decorate();
