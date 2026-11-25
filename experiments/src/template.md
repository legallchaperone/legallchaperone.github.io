This page is a template. Copy `template.md`, `template.zh.md` and the two data files to start an experiment; the rules it follows are in `experiments/SPEC.md`. Every run and number shown here is sample data.

## Setup

At most five sentences: the baseline by its exact name, linked to the recipe it comes from; the one thing we change; the data and the model sizes; the metric, defined once; and a link to the exact commit the runs use. A detail that does not change how a reader reads the figures stays out.

<details>
<summary>Details</summary>

Hyperparameters, hardware and caveats that change no conclusion go in a fold like this one.

```python
# the one thing being varied
for vocab_size in (256, 8_000, 128_000):
    run = train(model="130m", vocab_size=vocab_size, passes=8, seed=0)
```

</details>

## Experiments

### Does the effect show up at the smallest scale? {#q1 answered}

Yes: variant A ends well above variant B. The first paragraph under an answered question is its answer, in one or two sentences and in words.

{{figure: final}}

Between two figures, say only what the next figure needs, in one or two sentences.

{{figure: curve}}

### Does it hold at other model sizes? {#q2 testing}

{{figure: sizes}}

## Takeaways

Empty while the experiment runs. Right before publishing: one precise sentence with the result, negative results included. The same sentence goes into the manifest as the description, and appears under the title once the experiment has an end date.

## Related work

- **Work, Authors Year.** What it did, in one sentence. How this experiment relates to it: the same idea in a new setting, a test of its claim, or a different answer.

## Acknowledgements

People first, names in alphabetical order, then the compute acknowledgement your cluster asks for.
