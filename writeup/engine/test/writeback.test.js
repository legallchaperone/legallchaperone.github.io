// Per-section write-back must change only the edited section's bytes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArticle, sectionSource, replaceSection } from "../parse.js";

const ARTICLE = `---
title: Test
date: 2026-01-01
---

Intro with \\(x\\) and a fence:

\`\`\`md
## Not a heading {#nope}
\`\`\`

## First {#first}

Display math:

$$
\\sum_{i=1}^n x_i
## still math, not a heading
$$

### Detail {#first/detail}

~~~~python
# comment
## also not a heading {#fake}
~~~~

<!--
## commented out {#ghost}
-->

## Second {#second}

Text with \`## inline code\` and \\(\\alpha\\).

\`\`\`\`
\`\`\`
## nested fence, still code
\`\`\`
\`\`\`\`

## Third {#third}
Last line without trailing newline`;

/** Everything outside [start, end) of the given section. */
function outside(text, id) {
  const s = parseArticle(text).sections.find((x) => x.id === id);
  return text.slice(0, s.start) + "\u0000" + text.slice(s.end);
}

test("code fences, $$ blocks and comments never produce headings", () => {
  const { sections, errors } = parseArticle(ARTICLE);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    sections.map((s) => s.id),
    ["first", "first/detail", "second", "third"]
  );
});

test("sectionSource returns the heading and body, trimmed", () => {
  const { sections } = parseArticle(ARTICLE);
  const src = sectionSource(
    ARTICLE,
    sections.find((s) => s.id === "second")
  );
  assert.ok(src.startsWith("## Second {#second}\n"));
  assert.ok(src.includes("## nested fence, still code"));
  assert.ok(src.endsWith("````\n"));
});

for (const id of ["first", "first/detail", "second", "third"]) {
  test(`replacing {#${id}} leaves every other byte untouched`, () => {
    const { sections } = parseArticle(ARTICLE);
    const s = sections.find((x) => x.id === id);
    const edited = sectionSource(ARTICLE, s).replace(/\n$/, "") + "\n\nAdded \\(y^2\\) line.\n";
    const next = replaceSection(ARTICLE, id, edited);
    assert.equal(outside(next, id), outside(ARTICLE, id));
    assert.ok(next.includes("Added \\(y^2\\) line."));
    // The other sections still parse to the same ids and sources.
    const after = parseArticle(next).sections;
    assert.deepEqual(
      after.map((x) => x.id),
      sections.map((x) => x.id)
    );
    for (const other of sections.filter((x) => x.id !== id)) {
      const o = after.find((x) => x.id === other.id);
      assert.equal(next.slice(o.start, o.end), ARTICLE.slice(other.start, other.end));
    }
  });
}

test("saving the unchanged source is a no-op", () => {
  for (const s of parseArticle(ARTICLE).sections) {
    assert.equal(replaceSection(ARTICLE, s.id, sectionSource(ARTICLE, s)), ARTICLE);
  }
});

test("math and code inside the edited section survive verbatim", () => {
  const { sections } = parseArticle(ARTICLE);
  const first = sections.find((s) => s.id === "first");
  const src = sectionSource(ARTICLE, first).replace("Display math:", "Display math (edited):");
  const next = replaceSection(ARTICLE, "first", src);
  assert.ok(next.includes("$$\n\\sum_{i=1}^n x_i\n## still math, not a heading\n$$"));
  assert.ok(next.includes("~~~~python\n# comment\n## also not a heading {#fake}\n~~~~"));
});

test("CRLF files keep CRLF line endings", () => {
  const crlf = ARTICLE.replace(/\n/g, "\r\n");
  const { sections } = parseArticle(crlf);
  const s = sections.find((x) => x.id === "second");
  const next = replaceSection(crlf, "second", "## Second {#second}\nNew body.\n");
  assert.equal(outside(next, "second"), outside(crlf, "second"));
  assert.ok(next.includes("## Second {#second}\r\nNew body.\r\n"));
  assert.ok(!/[^\r]\n/.test(next));
  assert.equal(sections.length, 4);
});

test("unknown or duplicate ids are refused", () => {
  assert.throws(() => replaceSection(ARTICLE, "missing", "## X {#missing}\n"), /找不到章节/);
  const dup = ARTICLE + "\n\n## Again {#second}\n";
  assert.throws(() => replaceSection(dup, "second", "## Second {#second}\n"), /重复/);
});
