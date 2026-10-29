// Writeup viewer: scroll the article, the camera follows on the diagram.
//
// The diagram is one big SVG inside .wu-world; the camera is a single CSS
// transform on that element, updated from requestAnimationFrame. Section
// positions are measured only when layout changes (ResizeObserver), so a
// scroll event never forces a reflow.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const topbar = $(".wu-top");
const layout = $(".wu-layout");
const figure = $(".wu-figure");
const stage = $(".wu-stage");
const world = $(".wu-world");
const drawing = $(".wu-drawing");
const lift = $(".wu-lift");
const dim = $(".wu-dim");
const dimPath = $(".wu-dim path");
const hot = $(".wu-hot");
const fab = $(".wu-fab");
const split = $(".wu-split");
const article = $(".wu-article");
const tocBtn = $(".wu-toc-btn");
const tocMenu = $(".wu-toc-menu");

const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 820px)");

let data = JSON.parse($("#wu-data").textContent);

const READING = 0.28; // reading line, as a fraction of the visible text area
const FIT_MAX = 1.8; // never zoom a small frame in further than this
const ZOOM_MAX = 6;

let stageW = 0;
let stageH = 0;
let textTop = 0; // viewport y where the article becomes visible
let cam = { x: 0, y: 0, k: 1 };
let tween = null;
let raf = 0;
let settleTimer = 0;
let following = true;
let active; // undefined until first update; null = intro / no section
let items = [];
let navTarget; // set while a programmatic scroll is in flight
let navTimer = 0;

// ── Camera ────────────────────────────────────────────────────────────

const fullRect = () => ({ x: 0, y: 0, w: data.width || 1, h: data.height || 1 });
const sectionById = (id) => data.sections.find((s) => s.id === id);

/** The frame the camera should show for a section (sub → parent → none). */
function rectFor(id) {
  if (!id) return null;
  if (data.frames[id]) return data.frames[id];
  const parent = sectionById(id)?.parent;
  return (parent && data.frames[parent]) || null;
}

function fitScale(r) {
  const pad = Math.min(stageW, stageH) * 0.06 + 10;
  return Math.min((stageW - 2 * pad) / r.w, (stageH - 2 * pad) / r.h);
}
const minScale = () => fitScale(fullRect()) * 0.5;

function fit(r) {
  const k = clamp(fitScale(r), minScale(), Math.max(FIT_MAX, fitScale(fullRect())));
  return { k, x: stageW / 2 - (r.x + r.w / 2) * k, y: stageH / 2 - (r.y + r.h / 2) * k };
}

function apply(c) {
  cam = c;
  world.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.k})`;
}

function moving() {
  world.classList.add("is-moving");
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => world.classList.remove("is-moving"), 220);
}

const centerOf = (c) => ({ x: (stageW / 2 - c.x) / c.k, y: (stageH / 2 - c.y) / c.k });

function flyTo(target, instant = false) {
  if (instant || reduced.matches || !stageW) {
    tween = null;
    apply(target);
    return;
  }
  tween = { from: cam, to: target, t0: performance.now(), dur: 650 };
  if (!raf) raf = requestAnimationFrame(step);
}

function step(now) {
  raf = 0;
  if (!tween) return;
  const { from, to, t0, dur } = tween;
  const t = Math.min(1, (now - t0) / dur);
  const e = ease(t);
  // Interpolate the point under the stage centre and the log of the scale,
  // so zooming out and in again feels even.
  const a = centerOf(from);
  const b = centerOf(to);
  const k = Math.exp(lerp(Math.log(from.k), Math.log(to.k), e));
  const cx = lerp(a.x, b.x, e);
  const cy = lerp(a.y, b.y, e);
  apply({ k, x: stageW / 2 - cx * k, y: stageH / 2 - cy * k });
  moving();
  if (t < 1) raf = requestAnimationFrame(step);
  else tween = null;
}

function cameraForActive() {
  return fit(rectFor(active) || fullRect());
}

function detach() {
  tween = null;
  if (following) {
    following = false;
    updateFab();
  }
}

function resume(instant = false) {
  following = true;
  flyTo(cameraForActive(), instant);
  updateFab();
}

function zoomAt(px, py, factor) {
  detach();
  const k = clamp(cam.k * factor, minScale(), ZOOM_MAX);
  const f = k / cam.k;
  apply({ k, x: px - (px - cam.x) * f, y: py - (py - cam.y) * f });
  moving();
}

function updateFab() {
  fab.textContent = following ? "看全图" : "回到当前章节";
  fab.hidden = following && !rectFor(active);
}

// ── Diagram layers ────────────────────────────────────────────────────

function roundRectPath({ x, y, w, h }, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

function highlight(r) {
  lift.classList.toggle("is-off", !r);
  dim.classList.toggle("is-off", !r);
  if (!r) return;
  lift.hidden = false;
  Object.assign(lift.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  const M = 5000; // the dim layer reaches well past the drawing
  const W = data.width;
  const H = data.height;
  dimPath.setAttribute("d", `M${-M} ${-M}H${W + M}V${H + M}H${-M}Z${roundRectPath(r, 10)}`);
}

function setupDiagram() {
  const { width: W, height: H } = data;
  const svg = drawing.firstElementChild;
  if (svg) {
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
  }
  for (const el of [world, drawing]) Object.assign(el.style, { width: `${W}px`, height: `${H}px` });
  for (const el of [dim, hot]) {
    el.setAttribute("viewBox", `0 0 ${W} ${H}`);
    el.setAttribute("width", W);
    el.setAttribute("height", H);
  }
  const area = (id) => data.frames[id].w * data.frames[id].h;
  // Larger frames first, so nested (smaller) frames sit on top and win clicks.
  const ids = Object.keys(data.frames).sort((a, b) => area(b) - area(a));
  hot.innerHTML = ids
    .map((id) => {
      const f = data.frames[id];
      const title = sectionById(id)?.title || id;
      return `<rect data-id="${esc(id)}" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="8"><title>${esc(title)}</title></rect>`;
    })
    .join("");
}

// ── Article tracking ──────────────────────────────────────────────────

const docTop = (el) => el.getBoundingClientRect().top + scrollY;
const readingY = () => textTop + (innerHeight - textTop) * READING;

function measure() {
  stageW = stage.clientWidth;
  stageH = stage.clientHeight;
  textTop = topbar.offsetHeight + (narrow.matches ? figure.offsetHeight : 0);
  items = [];
  for (const sec of $$(".wu-sec", article)) {
    items.push({ id: sec.dataset.id, top: docTop(sec) });
    for (const sub of $$(".wu-sub", sec)) {
      if (!sub.open) continue;
      const top = docTop(sub);
      items.push({ id: sub.dataset.id, top, end: top + sub.offsetHeight, parent: sec.dataset.id });
    }
  }
}

function sectionAtReadingLine() {
  const line = scrollY + readingY();
  let hit = null;
  for (const it of items) {
    if (it.top <= line) hit = it;
    else break;
  }
  if (hit?.parent && line > hit.end) return hit.parent;
  return hit ? hit.id : null;
}

function setActive(id, instant = false) {
  if (id === active) return;
  active = id;
  for (const el of $$(".is-active", article)) el.classList.remove("is-active");
  for (const el of $$(".is-active", tocMenu)) el.classList.remove("is-active");
  if (id) {
    const el = document.getElementById(id);
    el?.classList.add("is-active");
    const parent = sectionById(id)?.parent;
    if (parent) document.getElementById(parent)?.classList.add("is-active");
    tocMenu.querySelector(`a[data-id="${CSS.escape(id)}"]`)?.classList.add("is-active");
  }
  highlight(rectFor(id));
  if (following) flyTo(cameraForActive(), instant);
  updateFab();
}

function hashId() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return "";
  }
}

function update(instant = false) {
  if (navTarget !== undefined) return;
  const id = sectionAtReadingLine();
  if (id === active) return;
  setActive(id, instant);
  if (hashId() !== (id || "")) {
    history.replaceState(history.state, "", id ? `#${id}` : location.pathname + location.search);
  }
}

function endNav() {
  navTarget = undefined;
  update();
}

/** Scroll the article to a section (null = top) and point the camera at it. */
function navigate(id, { push = true, instant = false } = {}) {
  const el = id ? document.getElementById(id) : null;
  if (id && !el?.matches(".wu-sec, .wu-sub")) return;
  if (el?.matches(".wu-sub") && !el.open) {
    el.open = true;
    measure();
  }
  if (push && hashId() !== (id || "")) {
    history.pushState(null, "", id ? `#${id}` : location.pathname + location.search);
  }
  following = true;
  navTarget = id;
  setActive(id, instant);
  updateFab();
  // Land the section's top just above the reading line, so tracking agrees.
  const top = el ? docTop(el) - readingY() + 12 : 0;
  window.scrollTo({ top: Math.max(0, top), behavior: instant || reduced.matches ? "instant" : "smooth" });
  clearTimeout(navTimer);
  navTimer = setTimeout(endNav, instant ? 0 : 200);
}

function stepMain(dir) {
  const mains = data.sections.filter((s) => !s.parent).map((s) => s.id);
  const cur = active ? sectionById(active)?.parent || active : null;
  const i = cur ? mains.indexOf(cur) : -1;
  const next = i + dir;
  if (next < -1 || next >= mains.length) return;
  navigate(next === -1 ? null : mains[next]);
}

// ── Events ────────────────────────────────────────────────────────────

let scrollQueued = false;
addEventListener(
  "scroll",
  () => {
    if (navTarget !== undefined) {
      clearTimeout(navTimer);
      navTimer = setTimeout(endNav, 150);
      return;
    }
    // Reading the article again hands the camera back to the article.
    if (!following) resume();
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      update();
    });
  },
  { passive: true }
);
addEventListener("scrollend", () => {
  if (navTarget !== undefined) {
    clearTimeout(navTimer);
    endNav();
  }
});
addEventListener("popstate", () => navigate(hashId() || null, { push: false }));

new ResizeObserver(() => {
  const prevW = stageW;
  const prevH = stageH;
  measure();
  if (following) flyTo(cameraForActive(), true);
  else if (prevW && (prevW !== stageW || prevH !== stageH)) {
    // keep the same point in the middle of the stage
    const c = { x: (prevW / 2 - cam.x) / cam.k, y: (prevH / 2 - cam.y) / cam.k };
    apply({ k: cam.k, x: stageW / 2 - c.x * cam.k, y: stageH / 2 - c.y * cam.k });
  }
}).observe(stage);
new ResizeObserver(() => {
  measure();
  update();
}).observe(article);

// Stage: drag to pan, wheel / pinch to zoom, click a frame to jump.
const pointers = new Map();
let gesture = null;
let pinch = null;

function pinchState() {
  const [a, b] = [...pointers.values()];
  return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
}

stage.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  stage.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    gesture = { x0: e.clientX, y0: e.clientY, moved: false, hotId: e.target.closest?.("rect[data-id]")?.dataset.id };
  } else if (gesture) {
    gesture.moved = true;
  }
  pinch = pointers.size === 2 ? pinchState() : null;
});

stage.addEventListener("pointermove", (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev || !gesture) return;
  const cur = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, cur);
  if (pointers.size === 1) {
    if (!gesture.moved && Math.hypot(cur.x - gesture.x0, cur.y - gesture.y0) < 5) return;
    if (!gesture.moved) {
      gesture.moved = true;
      stage.classList.add("is-panning");
    }
    detach();
    apply({ ...cam, x: cam.x + cur.x - prev.x, y: cam.y + cur.y - prev.y });
    moving();
  } else if (pointers.size === 2 && pinch) {
    const next = pinchState();
    const r = stage.getBoundingClientRect();
    detach();
    apply({ ...cam, x: cam.x + next.mx - pinch.mx, y: cam.y + next.my - pinch.my });
    zoomAt(next.mx - r.left, next.my - r.top, next.d / pinch.d);
    pinch = next;
  }
});

function endPointer(e) {
  if (!pointers.delete(e.pointerId)) return;
  pinch = pointers.size === 2 ? pinchState() : null;
  if (pointers.size) return;
  stage.classList.remove("is-panning");
  if (e.type === "pointerup" && gesture && !gesture.moved && gesture.hotId) navigate(gesture.hotId);
  gesture = null;
}
stage.addEventListener("pointerup", endPointer);
stage.addEventListener("pointercancel", endPointer);

stage.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stageH : 1;
    // ctrlKey is set for trackpad pinches, which report small deltas.
    const factor = Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0022));
    const r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, factor);
  },
  { passive: false }
);

fab.addEventListener("click", () => {
  if (following) {
    detach();
    flyTo(fit(fullRect()));
  } else {
    resume();
  }
});

// Table of contents.
function setMenu(open) {
  tocMenu.hidden = !open;
  tocBtn.setAttribute("aria-expanded", String(open));
}
tocBtn.addEventListener("click", () => setMenu(tocMenu.hidden));
document.addEventListener("click", (e) => {
  if (!tocMenu.hidden && !e.target.closest(".wu-toc")) setMenu(false);
  const a = e.target.closest('a[href^="#"]');
  if (!a || !(tocMenu.contains(a) || article.contains(a))) return;
  const id = decodeURIComponent(a.getAttribute("href").slice(1));
  if (!document.getElementById(id)?.matches(".wu-sec, .wu-sub")) return;
  e.preventDefault();
  setMenu(false);
  navigate(id);
});

document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
  switch (e.key) {
    case "+":
    case "=":
      zoomAt(stageW / 2, stageH / 2, 1.25);
      break;
    case "-":
    case "_":
      zoomAt(stageW / 2, stageH / 2, 0.8);
      break;
    case "ArrowRight":
      stepMain(1);
      break;
    case "ArrowLeft":
      stepMain(-1);
      break;
    case "Escape":
      if (!tocMenu.hidden) setMenu(false);
      else resume();
      break;
    case "f":
    case "F":
      resume();
      break;
    default:
      return;
  }
  e.preventDefault();
});

// Draggable divider between diagram and article (desktop only).
function setSplit(pct) {
  layout.style.setProperty("--split", `${clamp(pct, 25, 75)}%`);
}
try {
  const saved = parseFloat(localStorage.getItem("writeup-split"));
  if (saved) setSplit(saved);
} catch {}
const saveSplit = () => {
  try {
    localStorage.setItem("writeup-split", parseFloat(layout.style.getPropertyValue("--split")) || 50);
  } catch {}
};
split.addEventListener("pointerdown", (e) => {
  split.setPointerCapture(e.pointerId);
  split.classList.add("is-dragging");
  document.body.classList.add("is-resizing");
});
split.addEventListener("pointermove", (e) => {
  if (split.hasPointerCapture(e.pointerId)) setSplit((e.clientX / innerWidth) * 100);
});
split.addEventListener("pointerup", (e) => {
  split.releasePointerCapture(e.pointerId);
  split.classList.remove("is-dragging");
  document.body.classList.remove("is-resizing");
  saveSplit();
});
split.addEventListener("dblclick", () => {
  setSplit(50);
  saveSplit();
});
split.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  const cur = parseFloat(layout.style.getPropertyValue("--split")) || 50;
  setSplit(cur + (e.key === "ArrowLeft" ? -2 : 2));
  saveSplit();
});

// ── Start ─────────────────────────────────────────────────────────────

history.scrollRestoration = "manual";
setupDiagram();
measure();
const initial = hashId();
if (initial && document.getElementById(initial)) navigate(initial, { push: false, instant: true });
else update(true);
let landed = scrollY;
// Web fonts shift the layout; re-land on the deep link if nobody scrolled yet.
document.fonts?.ready.then(() => {
  measure();
  if (initial && scrollY === landed && document.getElementById(initial)) navigate(initial, { push: false, instant: true });
  else update();
  landed = -1;
});

// ── Hooks for the dev server's live reload (unused in production) ─────

export const viewer = {
  get active() {
    return active;
  },
  /** Re-measure after section bodies were swapped in place. */
  refresh() {
    measure();
    update();
  },
  /** Swap the whole article (sections added, removed or renamed). */
  replaceArticle(html, toc, sections) {
    const open = new Set($$(".wu-sub[open]", article).map((d) => d.id));
    const anchorId = active;
    const anchorTop = anchorId ? document.getElementById(anchorId)?.getBoundingClientRect().top : null;
    article.innerHTML = html;
    tocMenu.innerHTML = toc;
    data = { ...data, sections };
    for (const id of open) {
      const d = document.getElementById(id);
      if (d?.matches(".wu-sub")) d.open = true;
    }
    const anchor = anchorId && document.getElementById(anchorId);
    if (anchor && anchorTop != null) {
      window.scrollTo({ top: scrollY + anchor.getBoundingClientRect().top - anchorTop, behavior: "instant" });
    }
    measure();
    setupDiagram();
    active = undefined;
    navTarget = undefined;
    update(true);
  },
  /** Swap the SVG and frame boxes; the camera stays on the current section. */
  replaceDiagram(svg, { frames, width, height }) {
    drawing.innerHTML = svg;
    data = { ...data, frames, width, height };
    setupDiagram();
    highlight(rectFor(active));
    updateFab();
    if (following) flyTo(cameraForActive(), true);
  },
};
