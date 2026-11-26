// Checks of what the built site shows of drafts and of the template. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildSite, ROOT } from "../site.mjs";

const manifest = JSON.parse(await readFile(path.join(ROOT, "experiments/experiments.json"), "utf8"));
const slug = (e) => e.slug || e.file.replace(/\.md$/, "");
const { outputs } = await buildSite();
const page = (e) => outputs.get(`experiments/${slug(e)}/index.html`);
const elsewhere = ["index.html", "notes/index.html", "sitemap.xml", "feed.xml"];

test("the template is in no built page or list", () => {
  for (const e of manifest.filter((e) => e.template)) {
    assert.equal(page(e), undefined, `${slug(e)} has a page`);
    for (const [rel, html] of outputs) assert.ok(!html.includes(`/experiments/${slug(e)}/`), `${rel} links the template`);
  }
});

test('"draft": true builds no page', () => {
  for (const e of manifest.filter((e) => e.draft === true && !e.template)) assert.equal(page(e), undefined, `${slug(e)} has a page`);
});

test('"draft": "unlisted" is linked from /experiments/ and from nowhere else', () => {
  const unlisted = manifest.filter((e) => e.draft === "unlisted" && !e.template);
  const published = manifest.filter((e) => !e.draft && !e.template);
  for (const e of unlisted) {
    const href = `/experiments/${slug(e)}/`;
    assert.ok(page(e), `${slug(e)} has no page`);
    assert.match(page(e), /<meta name="robots" content="noindex" \/>/);
    assert.match(page(e), /<span class="tag">Draft<\/span>/);
    assert.ok(outputs.get("experiments/index.html").includes(`href="${href}"`), `${slug(e)} is not on /experiments/`);
    for (const rel of elsewhere) assert.ok(!outputs.get(rel).includes(href), `${rel} links ${slug(e)}`);
  }
  if (unlisted.length && !published.length) {
    assert.match(outputs.get("experiments/index.html"), /<meta name="robots" content="noindex" \/>/);
    for (const rel of elsewhere) assert.ok(!outputs.get(rel).includes('"/experiments/"'), `${rel} links /experiments/`);
    assert.ok(!outputs.get("sitemap.xml").includes("/experiments/"), "the sitemap lists /experiments/");
  }
});
