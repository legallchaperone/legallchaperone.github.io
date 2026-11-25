This page is a template. An experiment page is a lab notebook kept in public: it starts from one setup, lists the questions asked of it, and answers them one at a time, each with a figure and the runs behind it. It is updated while the work is still going on. A blog post comes later and tells the story once.

## Setup

State the baseline in a few sentences: the model, the data, the metric, and the one thing being varied. Link the exact code (a commit, not a branch) so every number can be traced.

<details>
<summary>Details</summary>

Longer notes go in a folded block so the page stays readable: hyperparameters, hardware, how the metric is computed, known caveats. Code blocks that name their language are coloured:

```python
# the one thing being varied
for vocab_size in (256, 8_000, 128_000):
    run = train(model="130m", vocab_size=vocab_size, passes=8, seed=0)
    print(f"{vocab_size}: {run.val_loss:.3f}")
```

</details>

## Questions

The map of the whole page. Each row links to its block below and carries the one-line answer, or says that it is still open.

<div class="eo-map">
<ol>
<li><a href="#q1"><span class="no">1</span><span class="tx"><span class="qq">Does the effect show up at the smallest scale?</span><span class="aa">Yes: 0.081 against 0.026, in every seed.</span></span><span class="dt">Nov 25</span></a></li>
<li><a href="#q2"><span class="no">2</span><span class="tx"><span class="qq">Does it hold at other model sizes?</span><span class="aa eo-miss">Running.</span></span><span class="dt">Nov 27</span></a></li>
</ol>
</div>

## Experiments

<h3 class="hyp" id="q1" data-toc="Does the effect show up at the smallest scale?"><span class="eo-no">Question 1 <span class="tag tag--accent">Answered</span></span>Does the effect show up at the smallest scale?</h3>

<p class="hyp-answer">Lead with the answer in one or two sentences, with the numbers. Then the evidence.</p>

<figure>
<svg viewBox="0 0 760 300" role="img" aria-label="Placeholder chart: two bars" style="width:100%;height:auto;font-family:var(--font-sans)">
<line x1="60" y1="250" x2="740" y2="250" stroke="var(--ch-axis)" />
<line x1="60" y1="170" x2="740" y2="170" stroke="var(--ch-grid)" />
<line x1="60" y1="90" x2="740" y2="90" stroke="var(--ch-grid)" />
<rect x="170" y="62" width="150" height="188" rx="3" fill="var(--ch-s1)" />
<rect x="460" y="190" width="150" height="60" rx="3" fill="var(--ch-ref)" />
<text x="245" y="52" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)">0.081</text>
<text x="535" y="180" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)">0.026</text>
<text x="245" y="272" text-anchor="middle" font-size="13" fill="var(--ink-3)">Variant A</text>
<text x="535" y="272" text-anchor="middle" font-size="13" fill="var(--ink-3)">Variant B</text>
</svg>
<figcaption>Say what the reader should see, with units. Draw figures as inline SVG using the <code>--ch-*</code> chart colours, or use an image.</figcaption>
</figure>

<details>
<summary>Runs</summary>

| Run | Config | Steps | Result |
| --- | --- | --- | --- |
| <span class="eo-d"></span>a-s0 | Variant A, seed 0 | 20k | 0.081 |
| <span class="eo-d"></span>b-s0 | Variant B, seed 0 | 20k | 0.026 |
| <span class="eo-d run"></span>a-s1 | Variant A, seed 1 | 12k / 20k | running |

</details>

<h3 class="hyp" id="q2" data-toc="Does it hold at other model sizes?"><span class="eo-no">Question 2 <span class="tag">Running</span></span>Does it hold at other model sizes?</h3>

<p class="hyp-answer">Not answered yet. Say what would count as a yes and what would count as a no before the runs finish.</p>

<div class="tip"><span class="tip-label">Note</span><p>A tinted block like this one is for a caveat the reader must not miss.</p></div>

## Record

Keep a dated log of what changed on this page, newest first, so a returning reader can see what is new.

- **Nov 25, 2026.** Page created with question 1 answered.
