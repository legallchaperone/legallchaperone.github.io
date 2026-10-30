// npm run new <slug> | npm run dev <slug> | npm run build

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAll, POSTS, SLUG, ARTICLE, DIAGRAM } from "./build.js";
import { closeExporter } from "./export.js";

const TEMPLATES = path.join(path.dirname(fileURLToPath(import.meta.url)), "templates");
const [cmd, slug] = process.argv.slice(2);

function needSlug() {
  if (!slug) fail(`Usage: npm run ${cmd} <slug>`);
  if (!SLUG.test(slug)) fail(`slug "${slug}" may only use lowercase letters, digits and hyphens, e.g. my-first-writeup`);
}

function fail(msg) {
  console.error(`\x1b[31m✖\x1b[0m ${msg}`);
  process.exit(1);
}

async function newPost() {
  needSlug();
  const dir = path.join(POSTS, slug);
  if (existsSync(dir)) fail(`posts/${slug}/ already exists`);
  await mkdir(dir, { recursive: true });
  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time
  const article = (await readFile(path.join(TEMPLATES, ARTICLE), "utf8")).replace("{{date}}", today);
  await writeFile(path.join(dir, ARTICLE), article);
  await writeFile(path.join(dir, DIAGRAM), await readFile(path.join(TEMPLATES, DIAGRAM)));
  console.log(`✓ Created posts/${slug}/${ARTICLE} and posts/${slug}/${DIAGRAM} (draft: true)\n  Next: npm run dev ${slug}`);
}

try {
  if (cmd === "new") await newPost();
  else if (cmd === "dev") {
    needSlug();
    const { dev } = await import("./dev.js");
    await dev(slug, { port: Number(process.env.PORT) || 4600 });
  } else if (cmd === "build") {
    const ok = await buildAll();
    await closeExporter();
    process.exit(ok ? 0 : 1);
  } else fail("Usage: npm run new <slug> | npm run dev <slug> | npm run build");
} catch (e) {
  await closeExporter();
  fail(e.message);
}
