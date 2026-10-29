// Browser tests for the viewer, on the demo post, at desktop and phone width.
// Run: npm run test:e2e   (screenshots go to $SHOTS or engine/.cache/shots)

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

import { compilePost, VIEWER } from "../build.js";
import { renderPage } from "../page.js";
import { closeExporter } from "../export.js";

const SHOTS = process.env.SHOTS || path.join(path.dirname(VIEWER), ".cache", "shots");
const SLUG = "demo";
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};

let server;
let base;
let browser;

before(async () => {
  const post = await compilePost(SLUG);
  assert.deepEqual(post.errors, [], "demo post should build cleanly");
  const html = renderPage(post);
  server = createServer(async (req, res) => {
    const p = new URL(req.url, "http://x").pathname;
    if (p === `/writeup/${SLUG}/`) return res.writeHead(200, { "content-type": "text/html" }).end(html);
    const name = p.replace(`/writeup/${SLUG}/`, "");
    if (name === "viewer.js" || name === "viewer.css") {
      const type = name.endsWith(".js") ? "text/javascript" : "text/css";
      return res.writeHead(200, { "content-type": type }).end(await readFile(path.join(VIEWER, name)));
    }
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/writeup/${SLUG}/`;
  browser = await chromium.launch();
  await mkdir(SHOTS, { recursive: true });
});

after(async () => {
  await browser?.close();
  server?.close();
  await closeExporter();
});

async function open(kind, hash = "") {
  const ctx = await browser.newContext(VIEWPORTS[kind]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base + hash);
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  return { page, ctx, errors };
}

/** Wait until the camera transform stops changing. */
async function settle(page) {
  let last = "";
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(120);
    const t = await page.$eval(".wu-world", (w) => w.style.transform);
    if (t === last) return;
    last = t;
  }
}

/** Where the viewer currently is: active section, hash, and the frame's on-screen box. */
const state = (page) =>
  page.evaluate(() => {
    const data = JSON.parse(document.getElementById("wu-data").textContent);
    const sub = document.querySelector(".wu-sub.is-active");
    const sec = document.querySelector(".wu-sec.is-active");
    const active = sub?.id ?? sec?.id ?? null;
    const m = /translate\(([-\d.e]+)px, ([-\d.e]+)px\) scale\(([-\d.e]+)\)/.exec(document.querySelector(".wu-world").style.transform);
    const [tx, ty, k] = m.slice(1).map(Number);
    const stage = document.querySelector(".wu-stage").getBoundingClientRect();
    const frame = active ? (data.frames[active] ?? data.frames[active.split("/")[0]]) : { x: 0, y: 0, w: data.width, h: data.height };
    const box = frame && { left: stage.left + tx + frame.x * k, top: stage.top + ty + frame.y * k, w: frame.w * k, h: frame.h * k };
    return {
      active,
      hash: decodeURIComponent(location.hash.slice(1)),
      open: [...document.querySelectorAll(".wu-sub[open]")].map((d) => d.id),
      fab: document.querySelector(".wu-fab").hidden ? null : document.querySelector(".wu-fab").textContent,
      stage: { left: stage.left, top: stage.top, w: stage.width, h: stage.height },
      box,
      k,
    };
  });

/** The camera shows the box centred in the stage, fully visible. */
function assertFramed(s, label) {
  const { box, stage } = s;
  const cx = box.left + box.w / 2 - (stage.left + stage.w / 2);
  const cy = box.top + box.h / 2 - (stage.top + stage.h / 2);
  assert.ok(Math.abs(cx) < 1.5 && Math.abs(cy) < 1.5, `${label}: frame centred (off by ${cx.toFixed(1)}, ${cy.toFixed(1)})`);
  assert.ok(box.w <= stage.w + 0.5 && box.h <= stage.h + 0.5, `${label}: frame fits in the stage`);
  // Either the frame fills most of the stage, or the zoom hit its cap (1.8×).
  const capped = Math.abs(s.k - 1.8) < 0.001;
  assert.ok(capped || box.w > stage.w * 0.6 || box.h > stage.h * 0.6, `${label}: frame fills most of the stage`);
}

/** Put a section's top just above the reading line, like a reader would. */
async function scrollToSection(page, id) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    const narrow = matchMedia("(max-width: 820px)").matches;
    const textTop = document.querySelector(".wu-top").offsetHeight + (narrow ? document.querySelector(".wu-figure").offsetHeight : 0);
    const reading = textTop + (innerHeight - textTop) * 0.28;
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY - reading + 30);
  }, id);
  await settle(page);
}

/** Screen point at the centre of a frame, given the current camera. */
const frameCenter = (page, id) =>
  page.evaluate((id) => {
    const data = JSON.parse(document.getElementById("wu-data").textContent);
    const f = data.frames[id];
    const m = /translate\(([-\d.e]+)px, ([-\d.e]+)px\) scale\(([-\d.e]+)\)/.exec(document.querySelector(".wu-world").style.transform);
    const [tx, ty, k] = m.slice(1).map(Number);
    const stage = document.querySelector(".wu-stage").getBoundingClientRect();
    return { x: stage.left + tx + (f.x + f.w / 2) * k, y: stage.top + ty + (f.y + f.h / 2) * k };
  }, id);

for (const kind of Object.keys(VIEWPORTS)) {
  test(`${kind}: top of the article shows the whole diagram`, async () => {
    const { page, ctx, errors } = await open(kind);
    const width = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert.equal(width[0], width[1], "no horizontal overflow");
    const s = await state(page);
    assert.equal(s.active, null);
    assert.equal(s.hash, "");
    assertFramed(s, "full view");
    await page.screenshot({ path: path.join(SHOTS, `${kind}-1-top.png`) });
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${kind}: scrolling moves the camera to each section's frame`, async () => {
    const { page, ctx, errors } = await open(kind);
    for (const id of ["encoder", "dynamics", "decoder", "objective"]) {
      await scrollToSection(page, id);
      const s = await state(page);
      assert.equal(s.active, id, `active section after scrolling to ${id}`);
      assert.equal(s.hash, id, "hash follows the reading position");
      assertFramed(s, id);
      if (id === "dynamics") await page.screenshot({ path: path.join(SHOTS, `${kind}-2-follow-dynamics.png`) });
    }
    // An expanded sub-component note takes over the camera while it is being read.
    await page.click(`[id="dynamics/transition"] > summary`);
    await scrollToSection(page, "dynamics/transition");
    const s = await state(page);
    assert.equal(s.active, "dynamics/transition");
    assertFramed(s, "dynamics/transition");
    await page.screenshot({ path: path.join(SHOTS, `${kind}-3-follow-sub.png`) });
    // Scrolling back to the top returns to the full view.
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page);
    assert.equal((await state(page)).active, null);
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${kind}: clicking a frame on the diagram jumps to its section`, async () => {
    const { page, ctx, errors } = await open(kind);
    const pt = await frameCenter(page, "encoder/posterior");
    if (kind === "mobile") await page.touchscreen.tap(pt.x, pt.y);
    else await page.mouse.click(pt.x, pt.y);
    await settle(page);
    const s = await state(page);
    assert.equal(s.active, "encoder/posterior");
    assert.equal(s.hash, "encoder/posterior");
    assert.ok(s.open.includes("encoder/posterior"), "collapsed note was expanded");
    assertFramed(s, "clicked frame");
    const headingVisible = await page.$eval(`[id="encoder/posterior"] > summary`, (el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    });
    assert.ok(headingVisible, "the note is scrolled into view");
    await page.screenshot({ path: path.join(SHOTS, `${kind}-4-hotspot.png`) });
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${kind}: deep links restore position and camera; back/forward work`, async () => {
    const { page, ctx, errors } = await open(kind, "#encoder/patchify");
    let s = await state(page);
    assert.equal(s.active, "encoder/patchify");
    assert.ok(s.open.includes("encoder/patchify"));
    assertFramed(s, "deep link");

    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await settle(page);
    s = await state(page);
    assert.equal(s.active, "encoder/patchify", "same section after reload");
    assertFramed(s, "after reload");
    await page.screenshot({ path: path.join(SHOTS, `${kind}-5-deeplink.png`) });

    // Jump with the table of contents (pushes history), then go back and forward.
    await page.click(".wu-toc-btn");
    await page.click('.wu-toc-menu a[data-id="objective"]');
    await settle(page);
    assert.equal((await state(page)).active, "objective");
    await page.goBack();
    await settle(page);
    s = await state(page);
    assert.equal(s.hash, "encoder/patchify");
    assert.equal(s.active, "encoder/patchify");
    assertFramed(s, "after back");
    await page.goForward();
    await settle(page);
    s = await state(page);
    assert.equal(s.active, "objective");
    assertFramed(s, "after forward");
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test("desktop: manual pan detaches the camera, reading resumes it; keys work", async () => {
  const { page, ctx, errors } = await open("desktop", "#dynamics");
  const st = (await state(page)).stage;
  await page.mouse.move(st.left + st.w * 0.3, st.top + st.h * 0.3);
  await page.mouse.down();
  await page.mouse.move(st.left + st.w * 0.6, st.top + st.h * 0.5, { steps: 6 });
  await page.mouse.up();
  let s = await state(page);
  assert.equal(s.fab, "回到当前章节", "dragging detaches the camera");
  assert.equal(s.active, "dynamics", "dragging does not change the section");

  await page.mouse.move(st.left + st.w / 2, st.top + st.h / 2);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(100);
  assert.ok((await state(page)).k > s.k, "wheel zooms in");

  await page.mouse.move(st.left + st.w + 200, st.top + 300); // over the article
  await page.mouse.wheel(0, 120);
  await settle(page);
  s = await state(page);
  assert.equal(s.fab, "看全图", "scrolling the article resumes following");
  assertFramed(s, "resumed");

  await page.click(".wu-fab"); // 看全图
  await settle(page);
  s = await state(page);
  assert.equal(s.fab, "回到当前章节");
  await page.keyboard.press("f");
  await settle(page);
  s = await state(page);
  assertFramed(s, "F re-fits the current section");

  await page.keyboard.press("ArrowRight");
  await settle(page);
  assert.equal((await state(page)).active, "decoder", "→ goes to the next main section");
  await page.keyboard.press("ArrowLeft");
  await settle(page);
  assert.equal((await state(page)).active, "dynamics", "← goes back");

  await page.keyboard.press("+");
  await page.waitForTimeout(50);
  assert.equal((await state(page)).fab, "回到当前章节", "+ zooms and detaches");
  await page.keyboard.press("Escape");
  await settle(page);
  assertFramed(await state(page), "Esc resumes following");
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("desktop: dragging the divider resizes both panes", async () => {
  const { page, ctx } = await open("desktop", "#decoder");
  const split = await page.$eval(".wu-split", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: innerHeight / 2 };
  });
  await page.mouse.move(split.x, split.y);
  await page.mouse.down();
  await page.mouse.move(1440 * 0.62, split.y, { steps: 5 });
  await page.mouse.up();
  await settle(page);
  const s = await state(page);
  assert.ok(Math.abs(s.stage.w - 1440 * 0.62) < 4, `stage is ~62% wide (got ${s.stage.w})`);
  assertFramed(s, "after resize");
  await ctx.close();
});
