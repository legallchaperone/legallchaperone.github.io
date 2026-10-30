// Keep blog/posts.json in step with published writeups. Only entries whose
// "url" starts with /writeup/ are ours; everything else is left untouched,
// in place.

import { readFile, writeFile } from "node:fs/promises";

export const urlFor = (slug) => `/writeup/${slug}/`;
const isOurs = (entry) => typeof entry?.url === "string" && entry.url.startsWith("/writeup/");

function entryFor(w) {
  const e = { title: w.title, date: w.date };
  if (w.description) e.description = w.description;
  e.url = urlFor(w.slug);
  return e;
}

/**
 * @param entries current posts.json array
 * @param writeups published posts: [{slug, title, date, description}]
 * @returns new array — writeup entries updated in place, new ones appended,
 *   ones no longer published (now a draft, or deleted) removed.
 */
export function syncPostsJson(entries, writeups) {
  const pending = new Map(writeups.map((w) => [urlFor(w.slug), w]));
  const out = [];
  for (const e of entries) {
    if (!isOurs(e)) {
      out.push(e);
      continue;
    }
    const w = pending.get(e.url);
    if (!w) continue;
    out.push(entryFor(w));
    pending.delete(e.url);
  }
  for (const w of pending.values()) out.push(entryFor(w));
  return out;
}

/** Rewrite the file only if something changed. Returns true if written. */
export async function updatePostsJsonFile(file, writeups) {
  const text = await readFile(file, "utf8");
  let entries;
  try {
    entries = JSON.parse(text);
  } catch (e) {
    throw new Error(`${file} is not valid JSON: ${e.message}`);
  }
  if (!Array.isArray(entries)) throw new Error(`${file} should be an array`);
  const next = JSON.stringify(syncPostsJson(entries, writeups), null, 2) + "\n";
  if (next === text) return false;
  await writeFile(file, next);
  return true;
}
