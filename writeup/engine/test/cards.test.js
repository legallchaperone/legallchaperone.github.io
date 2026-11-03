// Code cards: fence syntax, line ranges, reading files, highlighting and errors.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseInfo, extractCards, parseRanges, loadCard, loadCards, cardsHtml } from "../cards.js";
import { renderArticle } from "../article.js";

const fm = (body) => `---\ntitle: T\ndate: 2026-01-01\n---\n${body}`;
const F = "```";
const PY = Array.from({ length: 12 }, (_, i) => `x${i + 1} = ${i + 1}`).join("\n") + "\n";

async function postDir() {
  const dir = await mkdtemp(path.join(tmpdir(), "wu-cards-"));
  await writeFile(path.join(dir, "m.py"), PY);
  return dir;
}

// ── Syntax ────────────────────────────────────────────────────────────

test("info string: language, key=value pairs, quotes and the panel word", () => {
  assert.deepEqual(parseInfo('python file=m.py lines=1-3 title="a b"'), {
    lang: "python",
    attrs: { file: "m.py", lines: "1-3", title: "a b" },
    panel: true,
  });
  assert.deepEqual(parseInfo("text panel"), { lang: "text", attrs: {}, panel: true });
  assert.equal(parseInfo("python").panel, false, "a plain code block stays in the article");
});

test("extractCards removes card fences and keeps ordinary code blocks", () => {
  const md = `intro\n\n${F}python file=m.py\n${F}\n\nmiddle\n\n${F}python\nkeep = 1\n${F}\n\n~~~text panel\na\n~~~\nend\n`;
  const { md: rest, specs } = extractCards(md);
  assert.equal(specs.length, 2);
  assert.equal(specs[0].attrs.file, "m.py");
  assert.equal(specs[1].body, "a\n");
  assert.ok(rest.includes("keep = 1"), "ordinary code block kept");
  assert.ok(!rest.includes("m.py") && !rest.includes("~~~"), "card fences removed");
  assert.ok(rest.includes("middle") && rest.includes("end"));
});

test("parseRanges sorts and merges, and rejects nonsense", () => {
  assert.deepEqual(parseRanges("20-24, 11-12,13"), [
    [11, 13],
    [20, 24],
  ]);
  assert.deepEqual(parseRanges("5"), [[5, 5]]);
  assert.throws(() => parseRanges("3-1", "lines"), /not a valid range/);
  assert.throws(() => parseRanges("a-b", "lines"), /not a list of line ranges/);
});

test("renderArticle gives each section its card, with the fence's line number", () => {
  const a = renderArticle(fm(`${F}text panel\ntree\n${F}\n\n## A {#a}\n\ntext\n\n${F}python file=m.py lines=2-3\n${F}\n\n## B {#b}\n\nno card\n`));
  assert.deepEqual(a.errors, []);
  assert.equal(a.introCard.body, "tree\n");
  assert.equal(a.sections[0].card.line, 13);
  assert.equal(a.sections[0].card.attrs.lines, "2-3");
  assert.equal(a.sections[1].card, null);
  assert.ok(!a.sections[0].bodyHtml.includes("m.py"), "the fence is not in the article");
});

test("two cards in one section is an error", () => {
  const a = renderArticle(fm(`## A {#a}\n\n${F}python file=m.py\n${F}\n\n${F}python file=m.py\n${F}\n`));
  assert.match(a.errors.map((e) => e.message).join("\n"), /only one code card per section \(the first is on line 7\)/);
});

// ── Loading ───────────────────────────────────────────────────────────

test("file cards keep real line numbers, fold gaps and mark focus lines", async () => {
  const dir = await postDir();
  const { card, errors, warnings } = await loadCard({ lang: "python", attrs: { file: "m.py", lines: "2-3,7", focus: "3" }, body: "" }, dir);
  assert.deepEqual([errors, warnings], [[], []]);
  assert.equal(card.title, "m.py");
  assert.equal(card.meta, "lines 2–3, 7");
  const nums = card.rows.map((r) => /class="gutter">([^<]*)</.exec(r)[1]);
  assert.deepEqual(nums, ["2", "3", "⋯", "7"]);
  assert.match(card.rows[1], /class="ln is-focus"/);
  assert.match(card.rows[0], /--shiki-light:/, "highlighted with both themes");
  assert.match(card.rows[0], /--shiki-dark:/);
});

test("a whole file says how many lines it has", async () => {
  const { card } = await loadCard({ lang: "", attrs: { file: "m.py" }, body: "" }, await postDir());
  assert.equal(card.meta, "12 lines");
  assert.equal(card.rows.length, 12);
});

test("panel cards show their own body; start= sets the first line number", async () => {
  const { card } = await loadCard({ lang: "python", attrs: { start: "40", title: "train.py" }, body: "a = 1\nb = 2\n" }, ".");
  assert.equal(card.title, "train.py");
  assert.deepEqual(
    card.rows.map((r) => /class="gutter">([^<]*)</.exec(r)[1]),
    ["40", "41"]
  );
  const plain = await loadCard({ lang: "text", attrs: {}, body: "x\n" }, ".");
  assert.equal(plain.card.numbered, false, "a bare panel has no line numbers");
  assert.match(cardsHtml([{ id: "", ...plain.card }]), /class="wu-code is-plain"/);
});

test("card errors and warnings are readable", async () => {
  const dir = await postDir();
  const load = (attrs, body = "", lang = "python") => loadCard({ lang, attrs, body }, dir);
  assert.match((await load({ file: "nope.py" })).errors[0], /file=nope.py: file not found/);
  assert.match((await load({ file: "m.py", lines: "10-20" })).errors[0], /goes past the file \(lines 1–12\)/);
  assert.match((await load({ file: "m.py" }, "x = 1\n")).errors[0], /either file= or a code body/);
  assert.match((await load({ file: "m.py", lines: "1-3", focus: "5" })).warnings[0], /focus="5" includes lines the card does not show/);
  assert.match((await load({ file: "m.py" }, "", "klingon")).warnings[0], /no highlighting for "klingon"/);
});

test("loadCards collects cards in order and reports issues with article lines", async () => {
  const dir = await postDir();
  const a = renderArticle(
    fm(`${F}text panel\nt\n${F}\n\n## A {#a}\n\n${F}python file=m.py lines=1-2\n${F}\n\n## B {#b}\n\n${F}python file=gone.py\n${F}\n`)
  );
  const r = await loadCards(a, dir);
  assert.deepEqual(
    r.cards.map((c) => c.id),
    ["", "a"]
  );
  assert.deepEqual(r.errors, [{ line: 16, message: "code card: file=gone.py: file not found" }]);
  assert.deepEqual(
    r.files.map((f) => path.basename(f)),
    ["m.py", "gone.py"]
  );
});
