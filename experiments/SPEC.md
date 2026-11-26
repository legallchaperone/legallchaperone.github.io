# Experiment pages: the spec

Every experiment page on this site follows these rules. They are the owner's decisions; an agent working on a page follows them and does not relitigate them. The workflow is modelled on Wenhao Chai's experiment pages (wenhaochai.com); the wording and the tooling here are our own.

A rule changes only when the owner says so. Record the change here with its date, in the form `(owner, 2026-11-25)`, and put the same note beside the code or text it governs. An agent that makes a judgement call the owner has not ruled on marks it `(agent, date)` so it can be reviewed.

## What an experiment page is

A lab notebook kept in public. It starts from one setup, lists the questions asked of that setup, and answers them one at a time, each with its figures and the runs behind them. It is updated while the work is going on. A blog post comes afterwards, tells the story once, and links back to the page.

## The parts, in order

1. **Opening text** (optional): one short paragraph.
2. **Setup**: at most five sentences. The baseline by its exact name with a link to the recipe it comes from; the one thing we change; the data and the sizes; the metric, defined once; a link to the exact commit the runs use. Anything that does not change how a reader reads the figures goes in a Details fold.
3. **Questions**: generated. One line per question with its number, the first clause of its answer (or "Testing"), and the day its first run started.
4. **Experiments**: one block per question, in the order the questions came up, so the page shows how the work went.
5. **Takeaways**: empty while runs go on. Right before publishing, one precise sentence with the result, negative results included.
6. **Related work**: three to five of the closest works, not a survey. A link, what it did, how this experiment relates to it. Every reference is real and checked.
7. **Acknowledgements**: people first, in alphabetical order, then the compute acknowledgement the cluster asks for.
8. **Experiment record**: generated. Grouped by question, each run listed once under the question that introduced it, closing with the compute totals.
9. **Citation**: generated.

## Rules

- **The question is the unit of the page.** Each block is titled with the question its figures answer and carries a status: `answered` or `testing`. (owner, 2026-11-25)
- **An answered question leads with its answer**: the first paragraph, one or two sentences in words, at the altitude the figures support. A testing question gets its answer when it turns answered.
- **Nothing generated is typed.** The Questions map, the runs behind each question, the record, the compute totals and every number in a chart come from the data files. A hand-edited number is a bug. (owner, 2026-11-25)
- **The page is a dashboard while runs go on.** A planned figure is on the page from the start with its axes, legend and a status (`Planned`, `Queued`, `Running`), and fills in when its runs finish. A figure whose runs are dropped is deleted. Publish only when no placeholder is left.
- **No defensive writing in the main text.** State each finding plainly. Seed counts, the spread between seeds, failed attempts and caveats that change no conclusion move into a Details fold: under the figure (`more` in the figure's data) or at the end of the question. Nothing is deleted, only moved. When the finding is that we could not tell, say so once.
- **Prose is for an outside reader.** No run names, branch names or flags in the text; say what each setup does. Load the `writing-style` skill before writing.
- **English and Chinese for every text element.** (owner, 2026-11-25) The Chinese file mirrors the English one heading for heading; the build refuses a page whose two files do not line up.
- **The title names what the experiment measures, never its result.** The card shows only the picture, the dates and the title.
- **A figure title names what is plotted** and does not repeat the axes. A caption fits in two lines: what the figure shows in words, plus a reading key if the chart needs one. The question gives the motivation, so the caption does not.
- **Every finished run appears in at least one figure.** A run in no figure gets a figure or leaves the record's main rows.
- **Compute is accounted for.** The record closes with two lines, main runs and other compute (smoke tests, debugging, abandoned and superseded runs), in GPU-hours and jobs, so the two add up to what the page cost.
- **Code is traceable.** Each finished run links the public commit it ran and its W&B run. Publishing code needs the owner's approval for each push; see "Publishing code" below.
- **Standfirst and description.** While the experiment runs (`"end": "now"`), the page has no standfirst. When it finishes, set `end` to the date and put the Takeaways sentence in `description` and `description_zh`; it then appears under the title and as the page description.

## Files

For an experiment with the slug `my-experiment`:

| File                                         | Written by            | What it is                                    |
| -------------------------------------------- | --------------------- | --------------------------------------------- |
| `experiments/experiments.json`               | hand                  | The manifest entry (title, dates, tag, files) |
| `experiments/src/my-experiment.md`           | hand                  | The English text                              |
| `experiments/src/my-experiment.zh.md`        | hand                  | The Chinese text, same structure              |
| `experiments/data/my-experiment.figs.json`   | the experiment script | One spec per figure                           |
| `experiments/data/my-experiment.record.json` | the experiment script | One row per run, plus compute totals          |

The two data files are produced by a script that lives in the research repository of that experiment and reads the run logs, W&B and the scheduler. Until an experiment's research repository has a place for it, its script sits in `experiments/gen/` here (agent, 2026-11-25: `swift_ode_init.py` reads DeltaAI over SSH and changes nothing there). It is written for that experiment, not shared: each project logs and names things its own way. Regenerate the files; never edit them by hand.

### How the page is drawn

The build writes the page: text, the Questions map, the run tables and the record. Each chart is written twice, as a static picture and as the data it was drawn from. In the browser `assets/charts.mjs`, the same code the build uses, redraws every chart from that data and shows the value of the mark under the pointer (owner, 2026-11-25: draw the charts in the page). A chart with data draws itself the first time it scrolls into view: bars grow from the axis, lines are drawn from the left, points and values follow (owner, 2026-11-25). Without JavaScript, and for readers who ask for reduced motion, the static picture stays.

The deploy runs the build, so pushing new data files is enough to update a published page.

### Writing the text

```markdown
Opening paragraph.

## Setup

...

## Experiments

### Does a smaller vocabulary make repeated data hurt less? {#vocab answered}

Yes: the answer in one or two sentences.

{{figure: vocab-final}}

One or two sentences that set up the next figure.

{{figure: vocab-curve}}

### Does it hold at other model sizes? {#sizes testing}

{{figure: sizes}}

## Takeaways
```

- A question is a `###` heading ending in `{#id answered}` or `{#id testing}`. The id is permanent: links and the record use it.
- `{{figure: id}}` on its own line places the figure with that id from the figs file. A figure belongs to the question it is placed under.
- The Chinese file has the same `##` headings, question ids and figure lines in the same order, with the text translated.

### `figs.json`

```json
{
  "vocab-final": {
    "kind": "bar",
    "status": "",
    "title": { "en": "Loss at the end of training", "zh": "训练结束时的损失" },
    "caption": { "en": "…", "zh": "…" },
    "more": { "en": "What the caption leaves out.", "zh": "…" },
    "x": { "label": { "en": "Vocabulary", "zh": "词表" }, "categories": ["8K", "128K"] },
    "y": { "label": { "en": "Bits per byte", "zh": "每字节比特数" } },
    "series": [
      {
        "name": { "en": "8 passes", "zh": "8 遍" },
        "color": "s1",
        "points": [
          [0, 0.91],
          [1, 0.97]
        ]
      }
    ]
  }
}
```

`kind` is `line` or `bar`. For a line chart `points` are `[x, y]` and an axis may set `"scale": "log"`, `min` and `max`. For a bar chart `points` are `[category index, value]`. Colours are `s1` to `s4` and `ref` (the site's chart colours) or a hex value; `"dash": true` draws a dashed line. A figure with a `status` and no points is drawn as a placeholder, so give it `min` and `max`. Any text may be a plain string or `{ "en", "zh" }`.

### `record.json`

```json
{
  "gpu": "A100",
  "factors": [
    ["size", "Model", "模型"],
    ["seed", "Seed", "种子"]
  ],
  "rows": [
    {
      "setup": { "en": "8 passes over a tenth of the data", "zh": "十分之一的数据重复 8 遍" },
      "size": "130m",
      "seed": 0,
      "gpus": 4,
      "hours": 3.1,
      "figs": ["vocab-final", "vocab-curve"],
      "start": "2026-11-20T21:39-0600",
      "end": "2026-11-21T00:45-0600",
      "wandb": "https://wandb.ai/…/runs/…",
      "code": "https://github.com/…/tree/<commit>",
      "state": ""
    }
  ],
  "cost": { "main": { "gpu_hours": 68.4, "jobs": 3 }, "other": { "gpu_hours": 9.2, "jobs": 6 } }
}
```

- `setup` says what the run does in words. `factors` names the variables the page varies; each row gives its value for each.
- `figs` lists the figures that use the run. A run belongs to the questions those figures sit under; `"q": ["id"]` assigns it to a question before any figure shows it.
- `state` is empty for a finished run, otherwise `Planned`, `Queued`, `Running` or `Failed`.
- `cost` comes from the scheduler over every GPU job of the project, split into jobs that belong to a row and everything else.

## Publishing code

Not automated, on purpose. Rewriting history and force-pushing to a public repository cannot be undone, and research code may belong to a lab or to collaborators.

1. Work in a private repository. One branch per experiment, named after the slug, carrying the history as it was run.
2. Before anything is public, make a fresh clone and scrub it: replace cluster user names, group directories, account names and node names; scan every blob, file name and commit message for keys and identifiers until the scan is clean.
3. Ask the owner before each public push, naming the branch and the destination. No standing approval.
4. Only after the push do the `code` links in the record go live.

## The template

`experiments/src/template.md` is a starting point, not a page of the site (owner, 2026-11-25: nobody else may see it). It is never published and appears in no list or menu. `npm run dev` serves it at `/experiments/template/`.

## Drafts

`"draft": true` in the manifest keeps a page out of the built site; `npm run dev` still shows it.

`"draft": "unlisted"` shares a draft with the people who are given the address (owner, 2026-11-25: whoever opens `/experiments/` sees the drafts). The page is built at its final address, `/experiments/<slug>/`, and has a row on `/experiments/`; both carry a Draft tag. Nothing else points at it: not the home page, the top bar or the sitemap, and search engines are asked to stay away. This is not access control: anyone who types the address gets the page. A draft is unlisted only when its entry says so (agent, 2026-11-25), and once one experiment is published the top bar links `/experiments/`, drafts included.

This repository is public, so a draft's text and data are visible on GitHub even though the site does not serve them. Keep results that must stay private in the research repository until they can be published.
