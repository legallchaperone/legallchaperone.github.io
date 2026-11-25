Video world models can hold a scene together when a camera turns away and retraces its own path. This page tests whether they still return to the same place when the camera keeps turning in one direction through a full circle.

## Setup

Each model starts from a single image and rotates the camera in place along two paired trajectories of equal frame count and equal total rotation: a one-way turn past 360 degrees, and an out-and-back turn that goes halfway and reverses. We evaluate five open video world models, WorldCrafter-Fast, HY-WorldPlay, Matrix-Game 3.0, SANA-WM and Matrix-Game 2.0, alongside rendered real 360-degree panoramas as a positive control, with memoryless Matrix-Game 2.0 serving as the lower reference. Every model runs on 52 scenes made of 12 synthetic pilot images and 40 real photographs, except WorldCrafter-Fast, which currently covers 32 scenes. We measure loop closure with human ratings on whether the starting view returns and with the arc score, which checks whether the starting view enters smoothly across the approach before the best revisit frame rather than appearing by an abrupt switch. All 488 rollouts sit in the public [loop360 dataset](https://huggingface.co/datasets/cwx-umich/loop360-results), and the metric code lives in the [loop360 repository](https://github.com/legallchaperone/loop360).

<details>
<summary>Details</summary>

Because models do not follow commanded angles exactly, every one-way trajectory commands more than 360 degrees, ranging from 445 to 549 degrees across models, and the revisit frame is located from the video itself.

The arc score aligns each sampled frame to frame 0 with RootSIFT homographies, divides frame 0 into an 8 by 14 grid, and counts matchable cells confirmed by inliers. It normalizes the arrival stretch before the best revisit frame against the departure stretch right after frame 0 over the same camera travel, measured in image widths from frame-to-frame motion. A companion point score evaluates only the single best revisit frame.

All automatic scores on this page are computed on 640-pixel preview videos sampled every two frames, at a departure threshold of 0.15 unless stated otherwise. Two SANA-WM previews were unreadable and are excluded.

The real panorama control uses four CC0 panoramas rendered with pure rotation over 601 frames.

</details>

## Experiments

### Do video world models return to the starting view after a one-way full turn? {#human answered}

Some models do, yet every memory-equipped model succeeds far less often on a one-way turn than on an out-and-back turn of the same length. In an initial single-rater pass over 19 scenes each for HY-WorldPlay and Matrix-Game 3.0, 15 for SANA-WM, all 52 for Matrix-Game 2.0 and all 4 panoramas, both HY-WorldPlay and Matrix-Game 3.0 return in 100% of out-and-back videos, whereas one-way returns drop to 52.6% for HY-WorldPlay and 0% for Matrix-Game 3.0.

{{figure: human-return}}

<details>
<summary>Details</summary>

These ratings come from a single rater who was not blind to the model, covering question 1 only: whether the video clearly returned to the starting place. WorldCrafter-Fast was generated after this rating pass and has no human scores here.

</details>

### How do the five models score on the arc metric across both trajectories? {#arc-models answered}

The arc score reproduces the gap between out-and-back and one-way turns, and places WorldCrafter-Fast above the other models on one-way closure.

{{figure: arc-by-model}}

Comparing the single-frame point score with the arc score on one-way videos exposes cases where a model recovers the starting view abruptly rather than rotating into it smoothly.

{{figure: point-vs-arc}}

<details>
<summary>Details</summary>

SIFT matching penalizes returns whose fine texture was redrawn even when the layout matches; HY-WorldPlay one-way rollouts are affected most. Switching to a DINO patch aligner raises HY-WorldPlay one-way arc from 0.30 to 0.60, while keeping the same model ordering.

The arc score assumes pure rotation and under-scores rollouts where the camera drifts forward while turning.

</details>

### Does the arc score agree with human ratings without false closures? {#metric-check answered}

On question 1 alone, SIFT arc and point scores reach nearly the same AUC at a departure threshold of 0.15, 0.967 versus 0.964, while SIFT keeps false closures on unrelated scenes at 4.1%. Because the existing human ratings ask only whether the starting view returned, they cannot yet separate arc from point; testing what arc adds requires question 2 in the blind evaluation below.

{{figure: human-agreement}}

Pairing each video against another scene's first frame tests how often the aligner claims a match where none exists. DINO produces far more false matches than SIFT at low thresholds.

{{figure: negative-control}}

<details>
<summary>Details</summary>

Negative control pairs each rollout with the next scene in alphabetical order. A few consecutive real photographs were taken at the same location, which may account for part of the remaining false closures at 0.15.

</details>

### Does the arc score capture whether the way back stays consistent in blind human ratings? {#blind-eval testing}

A 60-video anonymized rating package covering all five models and real panoramas went out on 2026-11-25, asking raters separately whether the starting place returned and whether the approach leading into it was consistent.

{{figure: blind-eval}}

## Takeaways

## Related work

- **[WorldCrafter](https://arxiv.org/abs/2609.24984), Yu et al. 2026.** A video world model with camera-queryable implicit 3D-aware memory for consistent scene exploration. In our benchmark it achieves the highest one-way arc score among the tested models, while also showing the widest gap between point and arc scores.
- **[HY-WorldPlay](https://arxiv.org/abs/2512.14614), Sun et al. 2025.** A real-time interactive world model using reconstituted context memory and context forcing for long-term geometric consistency. It returns reliably on out-and-back turns and on roughly half of one-way turns.
- **[Matrix-Game 3.0](https://arxiv.org/abs/2604.08995), Wang et al. 2026.** A streaming interactive world model with camera-aware memory retrieval and injection. It closes every rated out-and-back loop yet fails on one-way loops, showing that retracing a path is a much weaker test of spatial memory than closing a circle.
- **[SANA-WM](https://arxiv.org/abs/2605.15178), Zhu et al. 2026.** A hybrid linear diffusion transformer for minute-scale world modeling with 6-DoF camera control. We also reuse 12 synthetic start images from its benchmark as our pilot scenes.
