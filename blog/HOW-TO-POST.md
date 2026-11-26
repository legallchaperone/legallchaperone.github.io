# Writing for the site

The site is plain static files. Notes and experiments are written in Markdown and turned into pages by one command; the home page is edited by hand.

The writing section is called **Notes** and is served at `/notes/` (owner, 2026-11-25: these are notes, not blog posts yet). Its sources stay in `blog/`, because the writeup engine and the old viewer read them there: Markdown in `blog/posts/`, the manifest in `blog/posts.json`. The address `/blog/` redirects to `/notes/`.

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

Open `http://127.0.0.1:4700/`. Pages are rebuilt on every reload, so save the Markdown file and refresh. The preview also shows drafts; nothing is written to disk. A mistake in a manifest or in a formula shows up as a red error page that names the file. The preview restarts itself when a file in `tools/` changes.

## 2. Add a note

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

| Field                        | Meaning                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `title`                      | Required.                                                                                         |
| `date`                       | Required, `YYYY-MM-DD`. Posts are listed newest first.                                            |
| `file`                       | The Markdown file in `blog/posts/`.                                                               |
| `description`                | Optional but recommended: the one-line summary in the lists.                                      |
| `slug`                       | Optional. The address is `/notes/<slug>/`; by default the file name without the date and `.md`.   |
| `links`                      | Optional extra links beside "Read" in the Blog list: `[{ "label": "Code", "url": "https://…" }]`. |
| `draft`                      | Optional. `true` keeps the post out of the build; it still shows in `npm run dev`.                |
| `title_zh`, `description_zh` | The Chinese title and summary of a bilingual post (see below).                                    |
| `cite`                       | Optional. `true` adds a Citation section with a BibTeX entry at the end.                          |
| `url`                        | Instead of `file`: link to a page built elsewhere. The writeup engine adds its articles this way. |

**Build and publish:**

```bash
npm run build
```

```bash
git add blog notes assets index.html feed.xml sitemap.xml
```

```bash
git commit -m "feat: Add the flow matching post"
```

```bash
git push
```

`npm run build` writes `notes/<slug>/index.html`, refreshes the lists in `notes/index.html` and `index.html`, and rewrites `feed.xml` and `sitemap.xml`. The generated pages are committed; GitHub Actions only copies files. To check that nothing is stale before a commit, run `npm run build -- --check`.

### Two languages

New posts are written in English and Chinese (owner, 2026-11-25). Put the Chinese text in a twin file next to the English one:

```
blog/posts/2026-12-01-flow-matching.md      English
blog/posts/2026-12-01-flow-matching.zh.md   Chinese
```

and add `title_zh` and `description_zh` to the manifest entry. The page then gets an EN / 中文 switch, and the reader's choice is remembered across the site.

The two files are matched heading by heading: each `##` heading becomes one heading that carries both languages, and the text under it is shown in the chosen language. So both files need the same `##` headings in the same order; the build stops with a message that names the first place they differ. A post without a `.zh.md` twin stays English only, as the older posts do.

### House rules for a post

- A post about an experiment comes after its experiment page. Link the experiment page and the code near the top with link cards.
- Load the `writing-style` skill (`.claude/skills/writing-style/`) before writing or editing prose.
- Add `"cite": true` when the post reports results someone might cite.

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

An experiment page is a lab notebook kept in public: one setup, the questions asked of it, and an answer per question with its figures and the runs behind them. It is updated while the work is going on; the blog post comes afterwards.

**Read `experiments/SPEC.md` first.** It is the contract every experiment page follows, with the file formats.

In short, for an experiment with the slug `my-experiment`:

1. Copy `experiments/src/template.md` and `template.zh.md` to `my-experiment.md` and `my-experiment.zh.md`. Questions are `###` headings ending in `{#id answered}` or `{#id testing}`; a line `{{figure: id}}` places a figure. `npm run dev` shows the template at `/experiments/template/`.
2. Have the experiment's own script write `experiments/data/my-experiment.figs.json` (one spec per figure) and `experiments/data/my-experiment.record.json` (one row per run, plus compute totals). These are generated from W&B and the scheduler and never typed.
3. Add an entry to `experiments/experiments.json`:

```json
{
  "title": "How Vocabulary Size Shapes Overfitting",
  "title_zh": "词表大小如何影响过拟合",
  "date": "2026-12-01",
  "end": "now",
  "tag": "Pretraining",
  "thumb": "/assets/img/experiments/vocab.png",
  "file": "my-experiment.md",
  "draft": true
}
```

`end` is `"now"` while the experiment runs, then the date it finished; at that point add `description` and `description_zh` with the one-sentence result, which becomes the standfirst. `tag` is the grey pill beside the dates. `thumb` is the 16:10 card picture (optional).

4. `npm run build`, then commit `experiments/` along with the rest.

The build draws the charts and writes the Questions map, the runs behind each question, the Experiment record and the Citation from those files. In the browser the charts are redrawn from the same data, with values on hover. The deploy runs the build as well, so a push of fresh data files from the experiment's machine updates the page without a local build. The Experiments link in the top bar and the Experiments section on the home page appear by themselves once one experiment is published (not a draft).

To show a draft to a few people, set `"draft": "unlisted"`: the page is built and listed on `/experiments/` with a Draft tag, and nothing else links to it. See "Drafts" in [experiments/SPEC.md](../experiments/SPEC.md).

## 5. Edit the home page

`index.html` is written by hand: change the bio, the papers and the CV lists directly. Only the parts between `<!-- gen:name -->` and `<!-- /gen:name -->` (top bar, footer, Blog and Experiments lists) are rewritten by `npm run build`; edit those in `tools/site.mjs`.

To add a paper, copy an `<article class="pub-row">` block. Add `is-highlight` to its class to put it on the tinted background.

## 6. Where things live

| Path                                               | What it is                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `assets/site.css`                                  | The whole design: colours, type, every component. Tokens are at the top.  |
| `assets/site.js`                                   | Mobile menu, contents highlight, copy buttons, image zoom.                |
| `tools/site.mjs`                                   | The generator: page shell, top bar, footer, lists, article template.      |
| `assets/charts.mjs`                                | The chart drawing, shared by the build and the page.                      |
| `tools/article.mjs`, `tools/charts.mjs`            | Bilingual assembly, experiment questions and record, charts.              |
| `experiments/SPEC.md`                              | The rules every experiment page follows, and the data file formats.       |
| `.claude/skills/writing-style/`                    | The prose rules agents load before writing.                               |
| `tools/build.mjs`, `tools/dev.mjs`                 | `npm run build` and `npm run dev`.                                        |
| `blog/posts.json`, `blog/posts/`                   | Blog manifest and Markdown sources.                                       |
| `experiments/experiments.json`, `experiments/src/` | Experiments manifest and Markdown sources.                                |
| `writeup/`                                         | The separate engine for diagram-linked articles; see `writeup/README.md`. |
