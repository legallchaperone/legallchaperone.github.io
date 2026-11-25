// The build's side of the charts. The drawing itself lives in assets/charts.mjs, which the page loads too:
// the build writes each chart as a static picture, and the page redraws it from the data embedded beside it.

import { L, chartSvg, colorOf, languagesOn } from "../assets/charts.mjs";

export { L, bi, STATUS_ZH, withLanguages } from "../assets/charts.mjs";

/** JSON that is safe inside a <script> element. */
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

/** The whole <figure>: title, legend, chart, numbered caption, the Details fold, and the data the page redraws from. */
export function figureHtml(id, spec, n) {
  let svg;
  try {
    svg = chartSvg(spec);
  } catch (e) {
    throw new Error(`figure "${id}": ${e.message}`);
  }
  const series = spec.series ?? [];
  const legend =
    series.length > 1 || series.some((s) => s.name)
      ? `<div class="legend">${series.map((s, i) => `<span class="li"><i class="${s.dash ? "lk" : "sw"}" style="--c:${colorOf(s, i)}"></i>${L(s.name)}</span>`).join("")}</div>`
      : "";
  const more = spec.more
    ? `\n<details class="eo-more"><summary>${L({ en: "Details", zh: "详细说明" })}</summary><p>${L(spec.more, { tag: "span" })}</p></details>`
    : "";
  // only what the chart needs travels with the page; title and captions are already in the HTML
  const data = { kind: spec.kind, status: spec.status ?? "", title: spec.title, x: spec.x, y: spec.y, series };
  return `<figure class="viz" id="fig-${id}" data-key="${id}"${languagesOn() ? ' data-bi="1"' : ""}>
<h4>${L(spec.title)}</h4>
${legend}
<div class="viz-scroll">${svg}</div>
<figcaption><b>${L({ en: `Figure ${n}.`, zh: `图 ${n}。` })}</b> ${L(spec.caption)}</figcaption>${more}
<script type="application/json" class="viz-data">${jsonForScript(data)}</script>
</figure>`;
}
