// Turns rendered Markdown into the body of an article page.
//
// Two jobs:
//   1. Bilingual pages. A post may have a Chinese twin (name.zh.md). The two files are matched heading by heading:
//      each "## heading" becomes one heading carrying both languages, and the text under it sits in one block per
//      language. The two files must have the same headings (and, on experiment pages, questions and figures) in order.
//   2. Experiment pages. Questions are written as "### Question? {#id answered}" (or "testing"), figures are placed
//      with a line "{{figure: id}}", and everything a reader should never see typed by hand is generated from
//      experiments/data/<slug>.record.json and <slug>.figs.json: the Questions map, the runs behind each question,
//      the experiment record with its compute totals, and the citation.

import { escapeHtml } from "../writeup/engine/render.js";
import { figureHtml, L, bi, STATUS_ZH, withLanguages } from "./charts.mjs";

const stripTags = (html) =>
  html
    .replace(/<annotation[\s\S]*?<\/annotation>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (html) =>
  stripTags(html)
    .toLowerCase()
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

// ---------- tokens ----------

const H2 = /<h2\b[^>]*>[\s\S]*?<\/h2>/;
const QUESTION = /<h3\b[^>]*>[^<]*(?:<(?!\/h3>)[^<]*)*\{#[\w-]+(?:\s+\w+)?\}\s*<\/h3>/;
const FIGURE = /<p>\{\{\s*figure:\s*[\w-]+\s*\}\}<\/p>/;

/** Cut rendered HTML into anchors (h2, question, figure) and the prose between them. */
function tokenize(html, { experiment }) {
  const anchors = new RegExp(`(${[H2, ...(experiment ? [QUESTION, FIGURE] : [])].map((r) => r.source).join("|")})`);
  const out = [];
  for (const piece of html.split(anchors)) {
    if (!piece || !piece.trim()) continue;
    let m;
    if ((m = /^<h2\b([^>]*)>([\s\S]*?)<\/h2>$/.exec(piece))) {
      // an id may be given as "## Heading {#id}" or, in raw HTML, as an id attribute
      const id = /\s*\{#([\w-]+)\}\s*$/.exec(m[2]);
      out.push({ type: "h2", inner: (id ? m[2].slice(0, id.index) : m[2]).trim(), id: id?.[1] ?? /\bid="([^"]+)"/.exec(m[1])?.[1] });
    } else if (experiment && (m = /^<h3\b[^>]*>([\s\S]*?)\s*\{#([\w-]+)(?:\s+(\w+))?\}\s*<\/h3>$/.exec(piece))) {
      out.push({ type: "q", inner: m[1].trim(), id: m[2], status: (m[3] || "testing").toLowerCase() });
    } else if (experiment && (m = /^<p>\{\{\s*figure:\s*([\w-]+)\s*\}\}<\/p>$/.exec(piece))) {
      out.push({ type: "fig", id: m[1] });
    } else out.push({ type: "prose", html: piece.trim() });
  }
  return out;
}

/** Group tokens as [anchor or null, prose under it]. */
function blocks(tokens) {
  const out = [{ anchor: null, prose: [] }];
  for (const t of tokens) {
    if (t.type === "prose") out[out.length - 1].prose.push(t.html);
    else out.push({ anchor: t, prose: [] });
  }
  return out.map((b) => ({ anchor: b.anchor, prose: b.prose.join("\n") }));
}

const describe = (a) =>
  !a
    ? "the opening text"
    : a.type === "h2"
      ? `the heading "${stripTags(a.inner)}"`
      : a.type === "q"
        ? `the question {#${a.id}}`
        : `the figure "${a.id}"`;

/** Match the English and Chinese blocks one to one. */
function pair(en, zh, names) {
  if (!zh) return en.map((b) => ({ anchor: b.anchor, en: b.prose, zh: null }));
  const n = Math.max(en.length, zh.length);
  for (let i = 0; i < n; i++) {
    const a = en[i]?.anchor;
    const b = zh[i]?.anchor;
    const same = en[i] && zh[i] && a?.type === b?.type && (a?.type === "h2" || a?.id === b?.id);
    if (!same) {
      throw new Error(
        `${names.zh} does not line up with ${names.en}: block ${i + 1} is ${en[i] ? describe(a) : "missing"} in English but ${zh[i] ? describe(b) : "missing"} in Chinese. Both files need the same headings${names.experiment ? ", questions and figures" : ""} in the same order.`
      );
    }
  }
  return en.map((b, i) => ({ anchor: b.anchor, zhAnchor: zh[i].anchor, en: b.prose, zh: zh[i].prose }));
}

// ---------- experiment record ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const wall = (s) => {
  const m = /^\d{4}-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(s || "");
  return m ? `${m[1]}-${m[2]} ${m[3]}:${m[4]}` : "";
};
const day = (s) => {
  const m = /^\d{4}-(\d\d)-(\d\d)/.exec(s || "");
  return m ? L({ en: `${MONTHS[+m[1] - 1]} ${+m[2]}`, zh: `${+m[1]}月${+m[2]}日` }) : "";
};
const num = (v) => (v >= 100 ? Math.round(v).toLocaleString("en-US") : v >= 10 ? v.toFixed(0) : v.toFixed(1));
const gpuHours = (rows) => rows.reduce((s, r) => s + (r.gpus || 0) * (r.hours || 0), 0);
const runs = (n) => `${n} ${n === 1 ? "run" : "runs"}`;
// Hours appear only when some run recorded them: an experiment without tracked compute shows no "0.0" (agent, 2026-11-25).
const timed = (rows) => rows.some((r) => r.hours != null);
const ext = (url, label) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`;

function checkRecord(record, where) {
  if (!record || !Array.isArray(record.rows)) throw new Error(`${where}: should be an object with a "rows" array`);
  record.rows.forEach((r, i) => {
    const at = `${where}, row ${i + 1}`;
    if (!r.setup) throw new Error(`${at}: "setup" is missing (what the run does, in words)`);
    if (r.figs !== undefined && !Array.isArray(r.figs)) throw new Error(`${at}: "figs" should be a list of figure ids`);
    if (r.state && !["Planned", "Queued", "Running", "Failed"].includes(r.state))
      throw new Error(`${at}: "state" should be Planned, Queued, Running, Failed or empty`);
  });
}

function runsTable(rows, ctx, { reusedFrom } = {}) {
  const factors = ctx.record.factors ?? [];
  const head = [
    L({ en: "Run", zh: "Run" }),
    ...factors.map(([, en, zh]) => L({ en, zh: zh ?? en })),
    `<span class="n">${escapeHtml(ctx.gpu)}s</span>`,
    L({ en: "Hours", zh: "小时" }),
    L({ en: "Time", zh: "时间" }),
    L({ en: "Figures", zh: "图" }),
    L({ en: "Code", zh: "代码" }),
    "W&amp;B",
  ];
  const body = rows
    .map((r) => {
      const figs = (r.figs ?? [])
        .filter((id) => ctx.figNo.has(id))
        .map((id) => `<a href="#fig-${id}">${ctx.figNo.get(id)}</a>`)
        .join(", ");
      const state = r.state
        ? `<span class="tag${r.state === "Running" ? " tag--accent" : ""}">${L({ en: r.state, zh: STATUS_ZH[r.state] ?? r.state })}</span>`
        : "";
      const dot = `<span class="eo-d${r.state === "Running" ? " run" : r.state === "Queued" ? " queued" : r.state ? " stop" : ""}"></span>`;
      const from = reusedFrom?.get(r);
      const reused = from ? ` <small>${L({ en: `from question ${from}`, zh: `来自问题 ${from}` })}</small>` : "";
      const time = r.start ? `${wall(r.start)}${r.end ? ` → ${wall(r.end)}` : ""}` : "";
      return `<tr><td class="v">${dot}<span>${L(r.setup)}${reused}</span></td>${factors.map(([key]) => `<td>${escapeHtml(String(r[key] ?? ""))}</td>`).join("")}<td class="n">${r.gpus ?? ""}</td><td class="n">${r.hours != null ? num(r.hours) : ""}</td><td class="w">${time}</td><td class="f">${figs}</td><td class="l">${r.code ? ext(r.code, "code") : ""}</td><td class="l">${r.wandb ? ext(r.wandb, "run") : state}</td></tr>`;
    })
    .join("\n");
  return `<div class="eo-tw"><table class="eo-t"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>\n${body}\n</tbody></table></div>`;
}

// ---------- assembly ----------

/**
 * @param en, zh   rendered HTML of the English file and of its Chinese twin (zh may be null)
 * @param names    { en, zh, experiment } file names for error messages
 * @param exp      null for a blog post, or { record, figs } for an experiment page
 * @param citation BibTeX text for a closing Citation section, or null
 * @returns { html, toc: [{ id, label, children: [{ id, label }] }] }
 */
export function assembleArticle(input) {
  return withLanguages(input.zh != null, () => assemble(input));
}

function assemble({ en, zh, names, exp = null, citation = null }) {
  const experiment = Boolean(exp);
  const paired = pair(blocks(tokenize(en, { experiment })), zh == null ? null : blocks(tokenize(zh, { experiment })), { ...names, experiment });
  const bilingual = zh != null;
  const both = (enHtml, zhHtml) => (bilingual ? L({ en: enHtml, zh: zhHtml }, { html: true }) : enHtml);
  const prose = (b) => {
    if (!bilingual) return b.en;
    return [b.en && `<div lang="en">\n${b.en}\n</div>`, b.zh && `<div lang="zh">\n${b.zh}\n</div>`].filter(Boolean).join("\n");
  };

  // First pass: number the questions and figures, and find which question each figure sits in.
  const questions = [];
  const figNo = new Map();
  let current = null;
  const usedIds = new Set();
  for (const b of paired) {
    const a = b.anchor;
    if (!a) continue;
    if (a.type === "h2") {
      current = null;
      let id = a.id || slugify(a.inner);
      for (let n = 2; usedIds.has(id); n++) id = `${a.id || slugify(a.inner)}-${n}`;
      usedIds.add(id);
      b.id = id;
    } else if (a.type === "q") {
      if (!["answered", "testing"].includes(a.status))
        throw new Error(`${names.en}: question {#${a.id}} has status "${a.status}"; use "answered" or "testing"`);
      if (usedIds.has(a.id)) throw new Error(`${names.en}: the id "${a.id}" is used more than once`);
      usedIds.add(a.id);
      current = { id: a.id, n: questions.length + 1, status: a.status, title: { en: a.inner, zh: b.zhAnchor?.inner ?? a.inner }, figs: [], block: b };
      questions.push(current);
    } else if (a.type === "fig") {
      if (!exp.figs[a.id]) throw new Error(`${names.en}: {{figure: ${a.id}}} has no entry "${a.id}" in ${names.figs}`);
      if (figNo.has(a.id)) throw new Error(`${names.en}: the figure "${a.id}" is placed more than once`);
      figNo.set(a.id, figNo.size + 1);
      current?.figs.push(a.id);
    }
  }

  // Which question each run belongs to: the first one whose figures use it (or that it names in "q").
  let ctx = null;
  const owner = new Map();
  const runsOf = new Map(questions.map((q) => [q.id, []]));
  const loose = [];
  if (exp) {
    ctx = { record: exp.record, figNo, gpu: exp.record.gpu || "GPU" };
    for (const r of exp.record.rows) {
      const named = [].concat(r.q ?? []);
      const using = questions.filter((q) => named.includes(q.id) || (r.figs ?? []).some((f) => q.figs.includes(f)));
      if (!using.length) loose.push(r);
      else {
        owner.set(r, using[0]);
        using.forEach((q) => runsOf.get(q.id).push(r));
      }
    }
  }
  const firstClause = (html, lang) => {
    const t = stripTags(/^<p[^>]*>([\s\S]*?)<\/p>/.exec(html || "")?.[1] ?? "");
    const m = lang === "zh" ? /^[^：。]*[：。]/.exec(t) : /^.*?(?::|\.(?=\s|$))/.exec(t);
    return (m ? m[0] : t).replace(/[:：]$/, lang === "zh" ? "。" : ".");
  };

  // Sub-headings in the English text get ids too, so a section can be linked to. The Chinese copy does not
  // repeat them: an id must be unique on the page.
  const withH3Ids = (html) =>
    html &&
    html.replace(/<h3>([\s\S]*?)<\/h3>/g, (_, inner) => {
      const base = slugify(inner);
      let id = base;
      for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
      usedIds.add(id);
      return `<h3 id="${id}">${inner}</h3>`;
    });
  for (const b of paired) b.en = withH3Ids(b.en);

  // Second pass: write the page.
  const out = [];
  const toc = [];
  let open = null; // the question being written, so its runs can be appended when it ends
  let mapDone = false;
  const closeQuestion = () => {
    if (!open) return;
    const rows = runsOf.get(open.id);
    if (rows.length) {
      const mine = rows.filter((r) => owner.get(r) === open);
      const reusedFrom = new Map(rows.filter((r) => owner.get(r) !== open).map((r) => [r, owner.get(r).n]));
      const count = L({ en: `${runs(rows.length)}, ${mine.length} new`, zh: `${rows.length} 个 run，其中 ${mine.length} 个新增` });
      out.push(
        `<details class="eo-runs"><summary><span>${L({ en: "Runs behind this question", zh: "这个问题用到的 run" })}</span><small>${count}</small></summary>\n${runsTable([...mine, ...reusedFrom.keys()], ctx, { reusedFrom })}\n</details>`
      );
    }
    open = null;
  };
  const questionsMap = () => {
    const rows = questions
      .map((q) => {
        const answered = q.status === "answered";
        const answer = answered
          ? L({ en: escapeHtml(firstClause(q.block.en, "en")), zh: escapeHtml(firstClause(q.block.zh ?? q.block.en, "zh")) }, { html: true })
          : L({ en: "Testing", zh: STATUS_ZH.Testing });
        const first = runsOf
          .get(q.id)
          .filter((r) => owner.get(r) === q && r.start)
          .map((r) => r.start)
          .sort()[0];
        return `<li${answered ? "" : ' class="test"'}><a href="#${q.id}"><span class="no">${q.n}</span><span class="tx"><span class="qq">${both(q.title.en, q.title.zh)}</span><span class="aa${answered ? "" : " eo-miss"}">${answer}</span></span><span class="dt">${day(first)}</span></a></li>`;
      })
      .join("\n");
    toc.push({ id: "questions", label: L({ en: "Questions", zh: "问题" }), children: [] });
    return `<h2 id="questions">${L({ en: "Questions", zh: "问题" })}</h2>\n<div class="eo-map"><ol>\n${rows}\n</ol></div>`;
  };

  paired.forEach((b, i) => {
    const a = b.anchor;
    if (!a) {
      // the opening text sits in one wrapper, so the space above it does not depend on the language shown
      if (b.en || b.zh) out.push(bilingual ? `<div class="ar-lead">\n${prose(b)}\n</div>` : b.en);
      return;
    }
    if (a.type === "h2") {
      closeQuestion();
      // the map goes in front of the section that holds the first question
      if (exp && !mapDone && questions.length) {
        const next = paired.slice(i + 1).find((x) => x.anchor && x.anchor.type !== "fig");
        if (next?.anchor.type === "q") {
          out.push(questionsMap());
          mapDone = true;
        }
      }
      const label = both(a.inner, b.zhAnchor?.inner ?? a.inner);
      const section = { id: b.id, label: label.replace(/<\/?a\b[^>]*>/g, ""), children: [] };
      toc.push(section);
      out.push(`<h2 id="${b.id}">${label} <a class="hanchor" href="#${b.id}" aria-label="Link to this section">#</a></h2>`);
      if (b.en || b.zh) out.push(prose(b));
    } else if (a.type === "q") {
      closeQuestion();
      const q = questions.find((x) => x.id === a.id);
      open = q;
      const answered = q.status === "answered";
      const status = answered ? { en: "Answered", zh: STATUS_ZH.Answered } : { en: "Testing", zh: STATUS_ZH.Testing };
      const title = both(q.title.en, q.title.zh);
      toc[toc.length - 1]?.children.push({ id: q.id, label: `<span class="eo-d${answered ? "" : " test"}"></span>${title}` });
      out.push(
        `<h3 class="hyp" id="${q.id}"><span class="eo-no">${L({ en: `Question ${q.n}`, zh: `问题 ${q.n}` })} <span class="tag${answered ? " tag--accent" : ""}">${L(status)}</span></span>${title}</h3>`
      );
      // the first paragraph under an answered question is its answer
      const mark = (html) => (answered && html ? html.replace(/^<p>/, '<p class="hyp-answer">') : html);
      if (b.en || b.zh) out.push(prose({ en: mark(b.en), zh: mark(b.zh) }));
    } else {
      out.push(figureHtml(a.id, exp.figs[a.id], figNo.get(a.id)));
      if (b.en || b.zh) out.push(prose(b));
    }
  });
  closeQuestion();

  if (exp) {
    // Experiment record: one folded line per question, each run listed once under the question that introduced it.
    const groups = questions.map((q) => [q, exp.record.rows.filter((r) => owner.get(r) === q)]).filter(([, rows]) => rows.length);
    const unit = `${ctx.gpu}-hours`;
    const fold = (no, title, rows) =>
      `<details class="eo-rq"><summary><span class="no">${no}</span><span class="tt">${title}</span><small>${L(timed(rows) ? { en: `${runs(rows.length)} · ${num(gpuHours(rows))} ${unit}`, zh: `${rows.length} 个 run · ${num(gpuHours(rows))} ${ctx.gpu} 小时` } : { en: runs(rows.length), zh: `${rows.length} 个 run` })}</small></summary>\n${runsTable(rows, ctx)}\n</details>`;
    const parts = groups.map(([q, rows]) => fold(q.n, both(q.title.en, q.title.zh), rows));
    if (loose.length) parts.push(fold("", L({ en: "Not in a figure yet", zh: "尚未出现在图中" }), loose));
    const cost = exp.record.cost;
    const line = (en, zh, c) =>
      c
        ? `<span>${L({ en: `${en}: ${num(c.gpu_hours)} ${unit}, ${c.jobs} jobs`, zh: `${zh}：${num(c.gpu_hours)} ${ctx.gpu} 小时，${c.jobs} 个作业` })}</span>`
        : "";
    const totals = cost ? `<p class="eo-cost">${line("Main runs", "主要 run", cost.main)}${line("Other compute", "其他算力", cost.other)}</p>` : "";
    const empty = `<p>${L({ en: "No runs recorded yet.", zh: "还没有记录任何 run。" })}</p>`;
    toc.push({ id: "record", label: L({ en: "Experiment record", zh: "实验记录" }), children: [] });
    out.push(
      `<h2 id="record">${L({ en: "Experiment record", zh: "实验记录" })}</h2>\n<div class="eo-record">\n${parts.join("\n") || empty}\n${totals}\n</div>`
    );
  }
  if (citation) {
    const label = both("Citation", "引用");
    toc.push({ id: "cite", label, children: [] });
    out.push(`<h2 id="cite">${label}</h2>\n<pre>${escapeHtml(citation)}</pre>`);
  }
  return { html: out.join("\n"), toc, bilingual };
}

export { checkRecord, bi };
