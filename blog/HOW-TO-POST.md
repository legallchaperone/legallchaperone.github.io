# Writing for the site

The site is plain static files. Posts and experiments are written in Markdown and turned into pages by one command; the home page is edited by hand.

Run every command below from the repository root.

## 0. First time only

```bash
npm install --prefix writeup
```

The build borrows the writeup engine's Markdown, KaTeX and code-highlighting packages, so they have to be installed once.

## 1. Preview while you write

```bash
npm run dev
```

Open `http://127.0.0.1:4700/`. Pages are rebuilt on every reload, so save the Markdown file and refresh. The preview also shows drafts; nothing is written to disk. A mistake in a manifest or in a formula shows up as a red error page that names the file.

## 2. Add a blog post

**Create the Markdown file** in `blog/posts/`, for example `blog/posts/2026-12-01-flow-matching.md`. There is no front matter; start with the text. Each `##` heading becomes an entry in the contents list (a post with fewer than three gets no list).

**Register it** in `blog/posts.json`:

```json
{
  "title": "Flow Matching in One Page",
  "date": "2026-12-01",
  "description": "One sentence, shown in the Blog list and on the home page.",
  "file": "2026-12-01-flow-matching.md"
}
```

| Field         | Meaning                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `title`       | Required.                                                                                         |
| `date`        | Required, `YYYY-MM-DD`. Posts are listed newest first.                                            |
| `file`        | The Markdown file in `blog/posts/`.                                                               |
| `description` | Optional but recommended: the one-line summary in the lists.                                      |
| `slug`        | Optional. The address is `/blog/<slug>/`; by default the file name without the date and `.md`.    |
| `links`       | Optional extra links beside "Read" in the Blog list: `[{ "label": "Code", "url": "https://…" }]`. |
| `draft`       | Optional. `true` keeps the post out of the build; it still shows in `npm run dev`.                |
| `url`         | Instead of `file`: link to a page built elsewhere. The writeup engine adds its articles this way. |

**Build and publish:**

```bash
npm run build
```

```bash
git add blog assets index.html
```

```bash
git commit -m "feat: Add the flow matching post"
```

```bash
git push
```

`npm run build` writes `blog/<slug>/index.html` and refreshes the lists in `blog/index.html` and `index.html`. The generated pages are committed; GitHub Actions only copies files. To check that nothing is stale before a commit, run `npm run build -- --check`.

## 3. What a post can contain

Plain Markdown: headings, bold, lists, quotes, links, tables, fenced code (name the language, e.g. ` ```python `, to get colours).

- **Maths**: inline `\(E = mc^2\)`, display `$$ ... $$`. It is rendered at build time; a KaTeX error stops the build and says where.
- **Images**: `<img src="/assets/img/posts/topic/figure.png" alt="What it shows" loading="lazy">` on its own line. Readers can click an image to enlarge it. For a caption, wrap it: `<figure><img …><figcaption>Caption.</figcaption></figure>`.
- **Callout**: `<div class="tip"><span class="tip-label">Note</span><p>Text.</p></div>`
- **Link card**: `<a class="more-card" href="/experiments/slug/"><span class="tile-meta">Experiment page</span><span class="tile-title">Title</span></a>`
- **Folded details**: `<details><summary>Details</summary>` … `</details>`, with a blank line after the summary so the Markdown inside is rendered.
- **Charts**: inline `<svg>` using the chart colours `var(--ch-s1)` … `var(--ch-s4)`, `var(--ch-ref)`, `var(--ch-grid)`, `var(--ch-axis)` from `assets/site.css`, so figures match the site.

Raw HTML passes through untouched, so anything the stylesheet supports can be written inline.

## 4. Add an experiment

An experiment page is a lab notebook kept in public: one setup, a list of questions, and an answer per question with its figure and runs. It is updated while the work is going on; the blog post comes afterwards.

1. Copy `experiments/src/template.md` to `experiments/src/<slug>.md` and replace each part. `npm run dev` shows the template at `/experiments/template/`.
2. Add an entry to `experiments/experiments.json`:

```json
{
  "title": "How Vocabulary Size Shapes Overfitting",
  "date": "2026-12-01",
  "end": "now",
  "tag": "Pretraining",
  "description": "The standfirst under the title: question, setup and main numbers in one paragraph.",
  "thumb": "/assets/img/experiments/vocab.png",
  "file": "vocab-overfitting.md"
}
```

`end` is `"now"` while the experiment is running, then the date it finished. `tag` is the grey pill beside the dates. `thumb` is the 16:10 card image (optional). The other fields work as for posts.

3. `npm run build`, then commit `experiments/` along with the rest.

The Experiments link in the top bar and the Experiments section on the home page appear by themselves once one experiment is published (not a draft).

## 5. Edit the home page

`index.html` is written by hand: change the bio, the papers and the CV lists directly. Only the parts between `<!-- gen:name -->` and `<!-- /gen:name -->` (top bar, footer, Blog and Experiments lists) are rewritten by `npm run build`; edit those in `tools/site.mjs`.

To add a paper, copy an `<article class="pub-row">` block. Add `is-highlight` to its class to put it on the tinted background.

## 6. Where things live

| Path                                               | What it is                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `assets/site.css`                                  | The whole design: colours, type, every component. Tokens are at the top.  |
| `assets/site.js`                                   | Mobile menu, contents highlight, copy buttons, image zoom.                |
| `tools/site.mjs`                                   | The generator: page shell, top bar, footer, lists, article template.      |
| `tools/build.mjs`, `tools/dev.mjs`                 | `npm run build` and `npm run dev`.                                        |
| `blog/posts.json`, `blog/posts/`                   | Blog manifest and Markdown sources.                                       |
| `experiments/experiments.json`, `experiments/src/` | Experiments manifest and Markdown sources.                                |
| `writeup/`                                         | The separate engine for diagram-linked articles; see `writeup/README.md`. |
