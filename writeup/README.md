# Writing a writeup

Each article is two files: you write `article.md` and draw `diagram.excalidraw`. Everything else (exporting the SVG, pointing the camera, rendering math, updating the Blog list) is automatic.

Run every command below from the `writeup/` folder.

## 0. First time only

```bash
npm install
```

```bash
npx playwright install chromium
```

The second command downloads a headless browser (about 100 MB) that the build uses to export the diagram to SVG.

In VS Code, install the **Excalidraw** extension (by pomdtr). After that, double-clicking a `.excalidraw` file opens it on a canvas.

## 1. Create: `npm run new <slug>`

```bash
npm run new my-topic
```

The `slug` is the last part of the URL and may only use lowercase letters, digits and hyphens. The command creates:

```
posts/my-topic/
  article.md           ← you write this
  diagram.excalidraw   ← you draw this
```

Both files contain a working example to edit. New articles start as drafts (`draft: true`) and are not published.

The published address is `cwx.world/writeup/my-topic/`.

## 2. Write: `article.md`

It starts with front matter:

```markdown
---
title: Article title
date: 2026-10-29
description: One sentence, shown in the Blog list
draft: true
---
```

`title` and `date` are required; `description` is optional; `draft: true` marks a draft. Delete that line (or set it to `false`) to publish.

The body:

- **Everything before the first `##`** is the intro. While the reader is there, the diagram shows everything.
- **Sections**: `## Title {#id}`. Ids use lowercase letters, digits and hyphens, e.g. `{#encoder}`, `{#data-flow}`.
- **Component notes**: `### Title {#parent/child}`, written under their section, e.g. `{#encoder/attention}`. They start collapsed; the end of each section lists them as buttons that open the note and move the camera.
- **Math**: inline `\(E = mc^2\)`, display `$$ ... $$`, the same as in `blog/`.
- **Images**: put the image next to `article.md` and use `![caption](figure.png)`; it is published with the article.
- Everything else is plain Markdown: bold, lists, quotes, code blocks, links, tables. A `##` inside a code block is not a heading.
- To link to another section, write `[see here](#encoder)`. Hovering the link outlines that region on the diagram.

## 3. Draw: `diagram.excalidraw`

Open `posts/my-topic/diagram.excalidraw` in VS Code and draw as you would on excalidraw.com.

**Give each section a Frame around its area of the diagram, and name the Frame after the section id:**

1. Press `F` (or use the Frame tool) and drag a box around what the section covers.
2. Double-click the Frame's name in its top-left corner and change it to the section id, e.g. `encoder`.
3. A component's Frame is named `parent/child`, e.g. `encoder/attention`, and can sit inside the parent Frame.

Notes:

- Frame borders and names are not shown on the published page; they only tell the camera where to look.
- Anything that belongs to a Frame is clipped at the Frame's edge (that is how Excalidraw works). Draw arrows that cross sections outside all Frames so they are not clipped.
- Frames without a name are ignored, so you can use them as plain groups.
- A section does not need a Frame. A section without one shows the whole diagram; a component without one stays on its parent's Frame. The build prints a warning as a reminder.

After you save (`⌘S`), the preview updates.

## 4. Preview: `npm run dev <slug>`

```bash
npm run dev my-topic
```

Then open the address it prints (by default `http://127.0.0.1:4600/writeup/my-topic/`). Drafts can be previewed too.

- **Live updates**: saving `article.md` or `diagram.excalidraw` updates the page without a reload. If only the text changed, the scroll position and camera stay put.
- **Errors**: a red bar at the top says which file, which line and what is wrong. It disappears once fixed. A yellow bar is a warning; close it with ✕.
- **Edit in the page**: hover a section heading and an **Edit** button appears on the right. It opens that section's Markdown on the left and a live preview (including math) on the right. `⌘S` saves just that section back to `article.md` and leaves the rest of the file untouched.
  - If `article.md` was changed in another editor while you were editing, the editor shows a conflict and refuses to save, so those changes are not overwritten. Click **Load latest** to start again.
- **Change the diagram**: edit `diagram.excalidraw` in VS Code's Excalidraw extension; after you save, the page swaps in the new diagram and the camera stays on the current section.

Diagram controls (readers have them too):

- Scroll or two-finger swipe over the diagram to pan; pinch, or hold `⌘`/`Ctrl` while scrolling, to zoom; double-click to zoom in (`Shift` + double-click to zoom out); drag to pan.
- `←` `→` move between sections, `+` `−` zoom, `F` returns to the current section, `Esc` closes the contents or returns to following.
- Scrolling the article again hands the camera back to the article.

`Ctrl+C` stops the preview.

## 5. Build: `npm run build`

When you are done, delete `draft: true` from the front matter, then:

```bash
npm run build
```

It:

- builds every non-draft article into `site/<slug>/`;
- writes each article's title, date and description into `blog/posts.json`, so the Blog list gets an entry linking to `/writeup/<slug>/`;
- removes `site/<slug>/` and the Blog entry when an article goes back to draft or is deleted.

Any error stops the build and nothing is written. Common errors:

| Error                                   | Fix                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `## heading is missing {#id}`           | Add `{#id}` at the end of the heading                                    |
| `Section id "…" is not valid`           | Use lowercase letters, digits and hyphens; components are `parent/child` |
| `Section id "…" is used more than once` | Pick another id (the error says where the first one is)                  |
| `Frame "…" has no matching section`     | The Frame name is misspelled, or the section does not exist yet          |
| `Frame name "…" is used more than once` | Each id can have only one Frame                                          |
| `Math error`                            | Fix the KaTeX as the message says                                        |

## 6. Publish: push

```bash
git add writeup/posts/my-topic writeup/site/my-topic blog/posts.json
```

```bash
git commit -m "feat: Add writeup my-topic"
```

```bash
git push
```

After the push to `main`, GitHub Actions deploys the site, and a few minutes later it is live at `cwx.world/writeup/my-topic/`.
