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
  if (!slug) fail(`用法：npm run ${cmd} <slug>`);
  if (!SLUG.test(slug)) fail(`slug "${slug}" 只能用小写字母、数字和连字符，例如 my-first-writeup`);
}

function fail(msg) {
  console.error(`\x1b[31m✖\x1b[0m ${msg}`);
  process.exit(1);
}

async function newPost() {
  needSlug();
  const dir = path.join(POSTS, slug);
  if (existsSync(dir)) fail(`posts/${slug}/ 已经存在`);
  await mkdir(dir, { recursive: true });
  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time
  const article = (await readFile(path.join(TEMPLATES, ARTICLE), "utf8")).replace("{{date}}", today);
  await writeFile(path.join(dir, ARTICLE), article);
  await writeFile(path.join(dir, DIAGRAM), await readFile(path.join(TEMPLATES, DIAGRAM)));
  console.log(`✓ 已创建 posts/${slug}/${ARTICLE} 和 posts/${slug}/${DIAGRAM}（draft: true）\n  下一步：npm run dev ${slug}`);
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
  } else fail("用法：npm run new <slug> | npm run dev <slug> | npm run build");
} catch (e) {
  await closeExporter();
  fail(e.message);
}
