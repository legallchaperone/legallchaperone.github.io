# Agent Guidelines

## The live site (read this first)

The site at cwx.world is a hand-built static site, not the al-folio Jekyll theme. The Jekyll files in this repository (`_config.yml`, `_layouts/`, `_includes/`, `_sass/`, Docker) are leftovers and are not deployed; `.github/workflows/deploy.yml` copies `index.html`, `assets/`, `blog/`, `notes/`, `experiments/`, `phd/` and `writeup/site/` as they are.

- **Design**: one stylesheet, `assets/site.css` (tokens at the top), and `assets/site.js`. Reuse the existing components instead of adding page-specific CSS. Notes and experiments (their pages and their two lists) redefine the tokens at the top of section 7 for a Notion-like page at high contrast (owner, 2026-11-25); the home page and the top bar and footer keep the base tokens. Change a colour or a corner there, not in the rules, and keep text at 7:1 or more on its fill (agent, 2026-11-25: the 7:1 floor, the system fonts and the chart colours are the agent's reading of "high contrast").
- **Home page**: `index.html`, edited by hand. Regions between `<!-- gen:name -->` and `<!-- /gen:name -->` are rewritten by the build; change those in `tools/site.mjs`.
- **Notes** (the writing section, served at `/notes/`; owner, 2026-11-25: call them notes, not blog posts) **and experiments**: Markdown plus a JSON manifest, built into static pages by `npm run build` and previewed with `npm run dev`. The full guide, including the components a post can use, is [blog/HOW-TO-POST.md](blog/HOW-TO-POST.md).
- **Generated files are committed.** After changing a post, a manifest, `tools/` or the shared top bar/footer, run `npm run build`; `npm run build -- --check` fails if anything is stale.
- **The deploy rebuilds too** (owner, 2026-11-25). So a push that changes only an experiment's data files (`experiments/data/<slug>.*.json`, pushed from the machine the experiment runs on) needs no local build, and its committed page may lag until someone next runs `npm run build`. Each data file has one writer, its experiment's generator: never edit one by hand, and do not regenerate it from a second machine.
- **Diagram-linked writeups** are a separate engine: [writeup/README.md](writeup/README.md).
- **Experiment pages follow [experiments/SPEC.md](experiments/SPEC.md).** Read it before touching one. Their charts, question map and run record are generated from `experiments/data/*.json`; never type those by hand. Charts are drawn by `assets/charts.mjs`, which the build and the page share (owner, 2026-11-25: draw the charts in the page).
- **Prose**: load the `writing-style` skill (`.claude/skills/writing-style/`) before writing or editing a post or an experiment page.
- **Languages**: new posts and experiment pages are bilingual, English plus a `.zh.md` twin (owner, 2026-11-25). Page chrome, the home page, docs and the writeup engine stay English only. Existing English-only posts are not translated unless asked.
- **Owner decisions are recorded where they apply.** When the owner rules on how something should be, note it beside the code or text it governs as `(owner, YYYY-MM-DD: what was decided)`, and in the relevant spec. Follow recorded decisions without reopening them; mark your own judgement calls `(agent, YYYY-MM-DD)`.
- **Publishing research code is never automatic.** A public push needs the owner's approval each time; see the spec.

The rest of this file describes the old al-folio setup.

## al-folio (legacy)

A simple, clean, and responsive Jekyll theme for academics.

## Quick Links by Role

- **Are you a coding agent?** → Read [`.github/copilot-instructions.md`](.github/copilot-instructions.md) first (tech stack, build, CI/CD, common pitfalls & solutions)
- **Customizing the site?** → See [`.github/agents/customize.agent.md`](.github/agents/customize.agent.md)
- **Writing documentation?** → See [`.github/agents/docs.agent.md`](.github/agents/docs.agent.md)
- **Need setup/deployment help?** → [INSTALL.md](INSTALL.md)
- **Troubleshooting & FAQ?** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Customization & theming?** → [CUSTOMIZE.md](CUSTOMIZE.md)
- **Quick 5-min start?** → [QUICKSTART.md](QUICKSTART.md)

## Essential Commands

### Local Development (Docker)

The recommended approach is using Docker.

```bash
# Initial setup & start dev server
docker compose pull && docker compose up
# Site runs at http://localhost:8080

# Rebuild after changing dependencies or Dockerfile
docker compose up --build

# Stop containers and free port 8080
docker compose down
```

### Pre-Commit Checklist

Before every commit, you **must** run these steps:

1.  **Format Code:**
    ```bash
    # (First time only)
    npm install --save-dev prettier @shopify/prettier-plugin-liquid
    # Format all files
    npx prettier . --write
    ```
2.  **Build Locally & Verify:**

    ```bash
    # Rebuild the site
    docker compose up --build

    # Verify by visiting http://localhost:8080.
    # Check navigation, pages, images, and dark mode.
    ```

## Critical Configuration

When modifying `_config.yml`, these **must be updated together**:

- **Personal site:** `url: https://username.github.io` + `baseurl:` (empty)
- **Project site:** `url: https://username.github.io` + `baseurl: /repo-name/`
- **YAML errors:** Quote strings with special characters: `title: "My: Cool Site"`

## Development Workflow

- **Git & Commits:** For commit message format and Git practices, see [.github/GIT_WORKFLOW.md](.github/GIT_WORKFLOW.md).
- **Code-Specific Instructions:** Consult the relevant instruction file for your code type.

| File Type                                     | Instruction File                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Markdown content (`_posts/`, `_pages/`, etc.) | [markdown-content.instructions.md](.github/instructions/markdown-content.instructions.md)       |
| YAML config (`_config.yml`, `_data/`)         | [yaml-configuration.instructions.md](.github/instructions/yaml-configuration.instructions.md)   |
| BibTeX (`_bibliography/`)                     | [bibtex-bibliography.instructions.md](.github/instructions/bibtex-bibliography.instructions.md) |
| Liquid templates (`_includes/`, `_layouts/`)  | [liquid-templates.instructions.md](.github/instructions/liquid-templates.instructions.md)       |
| JavaScript (`_scripts/`)                      | [javascript-scripts.instructions.md](.github/instructions/javascript-scripts.instructions.md)   |

## Common Issues

For troubleshooting, see:

- [Common Pitfalls & Workarounds](.github/copilot-instructions.md#common-pitfalls--workarounds) in copilot-instructions.md
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions
- [GitHub Issues](https://github.com/alshedivat/al-folio/issues) to search for your specific problem.
