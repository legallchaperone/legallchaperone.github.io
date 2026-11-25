// Checks of the article assembly (bilingual pairing, experiment questions, record). Run: npm test
import test from "node:test";
import assert from "node:assert/strict";

import { assembleArticle } from "../article.mjs";

const checks = [];
const ok = (name, cond, extra = "") => checks.push([name, Boolean(cond), extra]);

// 1. A bilingual blog post: headings merge, bodies stay per language, ids come from the English heading.
const en = `<p>Intro.</p>\n<h2>First part</h2>\n<p>English one.</p>\n<h2>Second part {#two}</h2>\n<p>English two.</p>`;
const zh = `<p>引言。</p>\n<h2>第一部分</h2>\n<p>中文一。</p>\n<h2>第二部分</h2>\n<p>中文二。</p>`;
const a = assembleArticle({ en, zh, names: { en: "a.md", zh: "a.zh.md" } });
ok("bilingual flag", a.bilingual === true);
ok("ids from English", a.toc.map((t) => t.id).join(",") === "first-part,two", a.toc.map((t) => t.id).join(","));
ok("one heading, two languages", a.html.includes('<h2 id="first-part"><span lang="en">First part</span><span lang="zh">第一部分</span>'));
ok("lead wrapper", a.html.startsWith('<div class="ar-lead">'));
ok("bodies per language", a.html.includes('<div lang="en">\n<p>English two.</p>\n</div>\n<div lang="zh">\n<p>中文二。</p>\n</div>'));
ok("{#id} stripped from the heading", !a.html.includes("{#two}"));

// 2. An English-only post is passed through unchanged apart from heading ids.
const b = assembleArticle({ en, zh: null, names: { en: "a.md" } });
ok("english-only has no lang wrappers", !b.html.includes("lang=") && b.bilingual === false);
ok("english-only keeps prose", b.html.includes("<p>Intro.</p>") && b.html.includes("<p>English one.</p>"));

// 3. Files that do not line up are refused, naming the place.
let msg = "";
try {
  assembleArticle({ en, zh: `<p>引言。</p>\n<h2>第一部分</h2>\n<p>中文一。</p>`, names: { en: "a.md", zh: "a.zh.md" } });
} catch (e) {
  msg = e.message;
}
ok("mismatch is an error", /does not line up/.test(msg) && /Second part/.test(msg), msg);

// 4. A citation section on a post.
const c = assembleArticle({ en, zh: null, names: { en: "a.md" }, citation: "@misc{x}" });
ok("citation section", c.html.includes('<h2 id="cite">Citation</h2>') && c.toc.at(-1).id === "cite");

// 5. An experiment: runs are assigned to the first question whose figures use them; a missing figure is an error.
const figs = {
  f1: { kind: "bar", title: "T", caption: "C", x: { categories: ["a"] }, series: [{ points: [[0, 1]] }] },
  f2: { kind: "line", title: "T2", caption: "C2", status: "Planned", x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, series: [] },
};
const record = {
  gpu: "A100",
  rows: [
    { setup: "one", gpus: 2, hours: 1.5, figs: ["f1", "f2"], start: "2026-11-01T10:00-0600" },
    { setup: "two", gpus: 1, hours: 2, figs: ["f2"], state: "Queued" },
    { setup: "loose", gpus: 1, hours: 1 },
  ],
};
const expEn = `<h2>Setup</h2>\n<p>S.</p>\n<h2>Experiments</h2>\n<h3>Is it so? {#q1 answered}</h3>\n<p>Yes: it is. More.</p>\n<p>{{figure: f1}}</p>\n<h3>And then? {#q2 testing}</h3>\n<p>{{figure: f2}}</p>\n<h2>Takeaways</h2>\n<p>T.</p>`;
const d = assembleArticle({ en: expEn, zh: null, names: { en: "e.md", figs: "e.figs.json" }, exp: { record, figs }, citation: "@misc{e}" });
ok("section order", d.toc.map((t) => t.id).join(",") === "setup,questions,experiments,takeaways,record,cite", d.toc.map((t) => t.id).join(","));
ok("questions in the contents", d.toc[2].children.map((k) => k.id).join(",") === "q1,q2");
ok("answer marked", d.html.includes('<p class="hyp-answer">Yes: it is. More.</p>'));
ok(
  "map shows first clause and Testing",
  d.html.includes('<span class="aa">Yes.</span>') && d.html.includes('<span class="aa eo-miss">Testing</span>')
);
ok(
  "q1 owns run one; q2 reuses it",
  /Runs behind this question<\/span><small>1 runs, 1 new/.test(d.html) && /<small>2 runs, 1 new/.test(d.html) && d.html.includes("from question 1")
);
ok("record totals per question", d.html.includes("1 runs · 3.0 A100-hours") && d.html.includes("1 runs · 2.0 A100-hours"));
ok("loose run listed last", d.html.includes("Not in a figure yet"));
ok("figures numbered in page order", d.html.includes("Figure 1.") && d.html.includes("Figure 2.") && d.html.includes('id="fig-f2"'));
ok("placeholder shows its status", d.html.includes(">Planned<"));
let msg2 = "";
try {
  assembleArticle({ en: expEn.replace("f2}}", "nope}}"), zh: null, names: { en: "e.md", figs: "e.figs.json" }, exp: { record, figs } });
} catch (e) {
  msg2 = e.message;
}
ok("unknown figure is an error", /no entry "nope"/.test(msg2), msg2);

for (const [name, cond, extra] of checks) test(name, () => assert.ok(cond, extra));
