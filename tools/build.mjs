// npm run build          write the generated pages
// npm run build -- --check   write nothing; exit 1 if a page on disk is out of date (handy before a commit)

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const check = process.argv.includes("--check");
const red = (s) => `\x1b[31m${s}\x1b[0m`;

let site;
try {
  site = await import("./site.mjs");
} catch (e) {
  if (e.code !== "ERR_MODULE_NOT_FOUND") throw e;
  console.error(red("✖") + " The build needs the writeup engine's packages. Run this once, then try again:\n\n    npm install --prefix writeup\n");
  process.exit(1);
}

try {
  const { outputs, stale, counts } = await site.buildSite();
  const changed = [];
  for (const [rel, content] of outputs) {
    const file = path.join(site.ROOT, rel);
    if (existsSync(file) && (await readFile(file, "utf8")) === content) continue;
    changed.push(rel);
    if (check) continue;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }

  for (const dir of stale) console.warn(`\x1b[33m!\x1b[0m ${dir} is no longer in a manifest. Delete the folder if the page should go away.`);
  if (check && changed.length) {
    console.error(red("✖") + ` Out of date, run \`npm run build\`:\n  ${changed.join("\n  ")}`);
    process.exit(1);
  }
  const what = `${counts.posts} notes, ${counts.experiments} experiments${counts.unlisted ? `, ${counts.unlisted} unlisted ${counts.unlisted === 1 ? "draft" : "drafts"}` : ""}`;
  console.log(changed.length ? `✓ Built ${what}. Wrote:\n  ${changed.join("\n  ")}` : `✓ ${what}; everything is up to date.`);
} catch (e) {
  console.error(red("✖") + " " + e.message);
  process.exit(1);
}
