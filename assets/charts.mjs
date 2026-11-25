// Charts for experiment pages. One module, used twice:
//   - by the build (tools/charts.mjs), which writes each chart into the page as a static picture, and
//   - by the page itself, which redraws every chart from the data embedded next to it and shows values on hover.
// So it must not import anything: it runs in Node and in the browser as it is.
//
// A figure spec (experiments/data/<slug>.figs.json):
//   { "kind": "line" | "bar",
//     "title": text, "caption": text, "more": text,          text is "string" or { "en": "...", "zh": "..." }
//     "status": "" | "Planned" | "Queued" | "Running",
//     "x": { "label": text, "scale": "linear" | "log", "categories": [text, ...], "min": n, "max": n },
//     "y": { "label": text, "scale": "linear" | "log", "min": n, "max": n },
//     "series": [{ "name": text, "color": "s1".."s4" | "ref" | "#hex", "dash": true, "points": [[x, y], ...] }] }
// For a bar chart the points are [category index, value]. A spec with a status and no points draws as a
// placeholder: axes, legend and the status word.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Normalise "text" or {en, zh} to {en, zh}. */
export const bi = (v) =>
  v && typeof v === "object" ? { en: String(v.en ?? ""), zh: String(v.zh ?? v.en ?? "") } : { en: String(v ?? ""), zh: String(v ?? "") };

// A page without a Chinese twin is written in English only, labels included, so a reader who chose 中文 elsewhere
// does not get a page that is half in each language.
let bilingualOn = true;
export const languagesOn = () => bilingualOn;
/** Run fn with both languages on or off, then restore the previous setting. */
export function withLanguages(on, fn) {
  const before = bilingualOn;
  bilingualOn = on;
  try {
    return fn();
  } finally {
    bilingualOn = before;
  }
}

/** Both languages as sibling spans; one span-free string when they are the same. Pass raw HTML with { html: true }. */
export function L(v, { html = false, tag = "span" } = {}) {
  const t = bi(v);
  const e = html ? (s) => s : esc;
  return !bilingualOn || t.en === t.zh ? e(t.en) : `<${tag} lang="en">${e(t.en)}</${tag}><${tag} lang="zh">${e(t.zh)}</${tag}>`;
}
const svgL = (v) => L(v, { tag: "tspan" });

export const STATUS_ZH = { Planned: "计划中", Queued: "排队中", Running: "运行中", Testing: "测试中", Answered: "已有结论" };

const W = 760;
const H = 340;
const M = { top: 34, right: 16, bottom: 46, left: 56 };
const COLORS = { s1: "var(--ch-s1)", s2: "var(--ch-s2)", s3: "var(--ch-s3)", s4: "var(--ch-s4)", ref: "var(--ch-ref)" };
const ORDER = ["s1", "s2", "s3", "s4", "ref"];
export const colorOf = (s, i) => (s.color ? (COLORS[s.color] ?? s.color) : COLORS[ORDER[i % ORDER.length]]);

const r1 = (n) => Math.round(n * 10) / 10;

/** About n round tick values covering [lo, hi]. */
function niceTicks(lo, hi, n = 5) {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}
function logTicks(lo, hi) {
  const out = [];
  for (let p = Math.floor(Math.log10(lo)); p <= Math.ceil(Math.log10(hi)); p++) out.push(10 ** p);
  const inside = out.filter((v) => v >= lo * 0.999 && v <= hi * 1.001);
  return inside.length >= 2 ? inside : [lo, hi];
}
export function fmt(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${r1(v / 1e9)}B`;
  if (a >= 1e6) return `${r1(v / 1e6)}M`;
  if (a >= 1e4) return `${r1(v / 1e3)}k`;
  if (a === 0) return "0";
  if (a < 0.001) return v.toExponential(0);
  return String(Number(v.toPrecision(4)));
}

function scale(axis, values, range, { fromZero = false } = {}) {
  const log = axis?.scale === "log";
  let lo = axis?.min ?? (values.length ? Math.min(...values) : log ? 1 : 0);
  let hi = axis?.max ?? (values.length ? Math.max(...values) : log ? 10 : 1);
  if (fromZero && axis?.min === undefined) lo = Math.min(0, lo);
  if (lo === hi) [lo, hi] = log ? [lo / 2, hi * 2] : [lo - 1, hi + 1];
  if (!log && axis?.min === undefined && axis?.max === undefined && !fromZero) {
    const pad = (hi - lo) * 0.06;
    lo -= pad;
    hi += pad;
  }
  if (!log && fromZero && axis?.max === undefined) hi += (hi - lo) * 0.1;
  const f = log ? Math.log10 : (v) => v;
  const at = (v) => range[0] + ((f(v) - f(lo)) / (f(hi) - f(lo))) * (range[1] - range[0]);
  return { at, ticks: log ? logTicks(lo, hi) : niceTicks(lo, hi), lo, hi };
}

// The status word sits in the middle of an empty chart, and in the corner once there are curves under it.
function statusBadge(status, hasData) {
  const cx = hasData ? W - M.right - 58 : (M.left + W - M.right) / 2;
  const cy = hasData ? M.top - 14 : (M.top + H - M.bottom) / 2;
  return `<g><rect x="${cx - 54}" y="${cy - 15}" width="108" height="30" rx="15" fill="var(--paper-3)"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" class="st">${svgL({ en: status, zh: STATUS_ZH[status] ?? status })}</text></g>`;
}

function frame(spec, ys, body, xTicksSvg) {
  const yl = spec.y?.label ? `<text x="${M.left - 44}" y="16" class="ax">${svgL(spec.y.label)}</text>` : "";
  const xl = spec.x?.label ? `<text x="${(M.left + W - M.right) / 2}" y="${H - 6}" text-anchor="middle" class="ax">${svgL(spec.x.label)}</text>` : "";
  const grid = ys.ticks
    .map((t) => {
      const y = r1(ys.at(t));
      return `<line x1="${M.left}" x2="${W - M.right}" y1="${y}" y2="${y}" stroke="var(--ch-grid)"/><text x="${M.left - 8}" y="${y + 4}" text-anchor="end" class="tk">${fmt(t)}</text>`;
    })
    .join("");
  const axis = `<line x1="${M.left}" x2="${W - M.right}" y1="${H - M.bottom}" y2="${H - M.bottom}" stroke="var(--ch-axis)"/>`;
  const label = esc(bi(spec.title).en + (spec.status ? ` (${spec.status})` : ""));
  const hasData = (spec.series ?? []).some((s) => s.points?.length);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${yl}${grid}${axis}${xTicksSvg}${xl}${body}${spec.status ? statusBadge(spec.status, hasData) : ""}</svg>`;
}

// Every mark carries data-s (its series), data-x (what the reader calls its position) and data-v (its value),
// which is what the hover label reads.
function lineChart(spec) {
  const series = spec.series ?? [];
  const pts = series.flatMap((s) => s.points ?? []);
  const xs = scale(
    spec.x,
    pts.map((p) => p[0]),
    [M.left + 14, W - M.right - 14]
  );
  const ys = scale(
    spec.y,
    pts.map((p) => p[1]),
    [H - M.bottom - 8, M.top + 8]
  );
  const xt = xs.ticks.map((t) => `<text x="${r1(xs.at(t))}" y="${H - M.bottom + 18}" text-anchor="middle" class="tk">${fmt(t)}</text>`).join("");
  const body = series
    .map((s, i) => {
      const c = colorOf(s, i);
      const p = (s.points ?? []).map(([x, y]) => [r1(xs.at(x)), r1(ys.at(y)), x, y]);
      if (!p.length) return "";
      const path = `<path d="M${p.map((q) => `${q[0]} ${q[1]}`).join("L")}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="6 5"' : ""}/>`;
      const dots = p
        .map(
          (q) =>
            `<circle class="mk" cx="${q[0]}" cy="${q[1]}" r="3.5" fill="${c}" stroke="var(--paper)" stroke-width="1.5" data-s="${i}" data-x="${fmt(q[2])}" data-v="${fmt(q[3])}"/>`
        )
        .join("");
      return `<g>${path}${dots}</g>`;
    })
    .join("");
  return frame(spec, ys, body, xt);
}

function barChart(spec) {
  const series = spec.series ?? [];
  const cats = spec.x?.categories ?? [];
  const ys = scale(
    spec.y,
    series.flatMap((s) => (s.points ?? []).map((p) => p[1])),
    [H - M.bottom, M.top + 8],
    { fromZero: true }
  );
  const band = (W - M.left - M.right) / Math.max(cats.length, 1);
  const group = Math.min(band * 0.62, 150 * Math.max(series.length, 1));
  const bw = group / Math.max(series.length, 1);
  const xt = cats
    .map((c, k) => `<text x="${r1(M.left + band * (k + 0.5))}" y="${H - M.bottom + 18}" text-anchor="middle" class="tk">${svgL(c)}</text>`)
    .join("");
  const body = series
    .map((s, i) =>
      (s.points ?? [])
        .map(([k, v]) => {
          const x = r1(M.left + band * (k + 0.5) - group / 2 + bw * i);
          const y = r1(ys.at(v));
          const h = r1(ys.at(Math.max(ys.lo, 0)) - y);
          return `<rect class="mk" x="${x + 1}" y="${y}" width="${r1(bw - 2)}" height="${Math.max(h, 0)}" rx="2" fill="${colorOf(s, i)}" data-s="${i}" data-c="${k}" data-v="${fmt(v)}"/><text x="${r1(x + bw / 2)}" y="${y - 6}" text-anchor="middle" class="vl">${fmt(v)}</text>`;
        })
        .join("")
    )
    .join("");
  return frame(spec, ys, body, xt);
}

/** The chart of a spec, as an SVG string. */
export function chartSvg(spec) {
  if (!["line", "bar"].includes(spec.kind)) throw new Error(`a figure's "kind" should be "line" or "bar", not "${spec.kind}"`);
  return spec.kind === "bar" ? barChart(spec) : lineChart(spec);
}

// ---------- in the page ----------

/** Redraw every chart on the page from the data embedded in its figure, and label the mark under the pointer. */
export function hydrate(root = document) {
  for (const fig of root.querySelectorAll("figure.viz")) {
    const data = fig.querySelector("script.viz-data");
    const box = fig.querySelector(".viz-scroll");
    if (!data || !box) continue;
    let spec;
    try {
      spec = JSON.parse(data.textContent);
    } catch {
      continue; // keep the picture the build drew
    }
    const both = fig.dataset.bi === "1";
    box.innerHTML = withLanguages(both, () => chartSvg(spec));

    const tip = document.createElement("div");
    tip.className = "viz-tip";
    tip.hidden = true;
    fig.append(tip);
    const svg = box.querySelector("svg");
    const marks = [...svg.querySelectorAll(".mk")];
    let current = null;
    const show = (mark) => {
      if (mark === current) return;
      current?.classList.remove("on");
      current = mark;
      if (!mark) {
        tip.hidden = true;
        return;
      }
      mark.classList.add("on");
      const s = spec.series[Number(mark.dataset.s)];
      const isBar = mark.dataset.c !== undefined;
      tip.innerHTML = withLanguages(both, () => {
        const name = bi(s.name).en ? `<span class="tn"><i style="background:${colorOf(s, Number(mark.dataset.s))}"></i>${L(s.name)}</span>` : "";
        // where the mark is: its category for a bar, "<x label> <x>" for a point on a line
        const at = isBar ? L(spec.x.categories[Number(mark.dataset.c)]) : `${L(spec.x?.label ?? "")} ${esc(mark.dataset.x)}`.trim();
        return `${name}<b>${esc(mark.dataset.v)}</b><span class="ta">${at}</span>`;
      });
      tip.hidden = false;
      // place the label above the mark, inside the figure
      const m = mark.getBoundingClientRect();
      const f = fig.getBoundingClientRect();
      const left = Math.min(Math.max(m.left + m.width / 2 - f.left - tip.offsetWidth / 2, 0), f.width - tip.offsetWidth);
      tip.style.left = `${left}px`;
      tip.style.top = `${m.top - f.top - tip.offsetHeight - 8}px`;
    };
    // the nearest mark within reach of the pointer, so a 7-pixel dot does not have to be hit exactly
    svg.addEventListener("pointermove", (e) => {
      let best = null;
      let bestD = 28 * 28;
      for (const mark of marks) {
        const b = mark.getBoundingClientRect();
        const inside = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
        const dx = e.clientX - (b.left + b.width / 2);
        const dy = e.clientY - (b.top + b.height / 2);
        const d = inside ? 0 : dx * dx + dy * dy;
        if (d < bestD) [best, bestD] = [mark, d];
      }
      show(best);
    });
    svg.addEventListener("pointerleave", () => show(null));
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => hydrate());
  else hydrate();
}
