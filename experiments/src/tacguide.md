A robot policy that feels an object through tactile sensors can teach a policy that only sees it. This page tests whether the difference between the two can be amplified, the way classifier-free guidance amplifies the effect of a text prompt.

## Setup

The baseline is OpenVTLA, the policy released with the [OpenViTac](https://github.com/FVL-Repo/OpenViTac) benchmark: π0.5 with tactile tokens from AnyTouch 2 placed before its visual tokens, trained by flow matching with the released recipe. Next to it we train a vision-only π0.5 on the same demonstrations, and we combine the two velocity predictions as \(v = v_{\text{vision}} + w\,(v_{\text{touch}} - v_{\text{vision}})\), where \(w = 1\) gives back the policy with touch and \(w > 1\) extrapolates beyond it. The combination either runs at test time or is distilled into a vision-only student, which then needs no tactile sensor. Every policy trains on the released demonstrations of Grasp Chip, a task in which the robot picks up a fragile potato chip and sets it on a tray, for 10k steps with 64 samples per step. The metric is closed-loop success in the OpenViTac simulator, judged by the benchmark's own task check. The code is a [fork of OpenViTac](https://github.com/legallchaperone/TacGuide), and the record links the commit each run started from.

<details>
<summary>Details</summary>

The policy with touch receives two camera images and, for each of the two fingertip sensors, a clip of four tactile frames. The vision-only policies receive the two camera images. As in the released configuration, no policy receives the robot's joint state.

A policy predicts 50 actions at a time. The simulator executes the first 20 and then asks for a new prediction.

The distilled student starts from the same weights and uses the same optimiser as the vision-only policy. In each training step the frozen policy with touch and the student see the same augmented images, and the student regresses the teacher's velocity.

A new scene is one that the simulator samples with a seed outside the range used for the demonstrations. A training scene uses a seed from the range that the demonstrations were collected with.

About a third of the simulator launches start in a broken state. An episode is kept only if, at its first step, both tactile images show all of their markers and the wrist image has the brightness of the training data. Otherwise the episode is run again.

</details>

## Experiments

### How often do the policies complete Grasp Chip after 10k training steps? {#closed-loop answered}

Almost never: the policy with touch completes a single episode, and the vision-only policy and the distilled student complete none. The failures include scenes taken from the training demonstrations.

{{figure: success}}

Grasp Chip may be unable to show an effect of tactile guidance at all. An [open issue](https://github.com/FVL-Repo/OpenViTac/issues/5) on the benchmark reports that every learned policy its authors tried scores 0 of 50 on this task, and attributes this to two tolerances in the success check that the scripted expert never approaches.

<!-- (owner, 2026-11-25: this remark changes how the page is read, so it stays in the main text, not in a fold) -->

The training loss gives no sign of the failure. Both policies trained on demonstrations converge smoothly.

{{figure: loss}}

### Where do the failed grasps go wrong? {#miss testing}

We measure how far from the centre of the chip the gripper first comes down. This distance does not separate success from failure: the one successful episode lands farther from the centre than the failed episodes of the same policy do on average.

{{figure: miss}}

<details>
<summary>Details</summary>

On frames where the demonstrated arm is at rest, each predicted chunk still moves three joints by about 1 mrad, which shifts the gripper by about 0.4 mm. This offset does not depend on the position inside the chunk, on the sampled noise, on the numerical precision or on the number of denoising steps. The policy replans every 20 steps without seeing the joint state, so it cannot notice the drift.

The simulator executes the commands exactly: commanded and reached joint angles agree in free motion.

Without the renderer's upscaler the camera images are brighter and sharper than the training data, which moved the predicted grasp by up to 27 mm in an earlier round. Every episode on this page passed a brightness check on its first frame.

The demonstrations contain no second attempts.

</details>

### Does training for 20k steps bring the gripper onto the chip? {#longer testing}

The OpenViTac paper trains for 20k steps, and the released code defaults to 10k.

{{figure: loss-20k}}

{{figure: success-20k}}

### Do the same two policies complete Gear Assembly? {#gear testing}

{{figure: success-gear}}

### Does tactile guidance raise the success of a vision-only policy? {#guidance testing}

{{figure: success-guidance}}

## Takeaways

## Related work

- **[OpenViTac](https://arxiv.org/abs/2610.10384), Wu et al. 2026.** A benchmark of 11 visuo-tactile manipulation tasks in simulation with paired real-world tasks, released with the OpenVTLA policy. Our policy with touch is OpenVTLA trained with its released recipe, and all evaluations use its simulator.
- **[π0.5](https://arxiv.org/abs/2504.16054), Physical Intelligence 2025.** A vision-language-action model that generates action chunks by flow matching. It is the backbone of every policy on this page.
- **[AnyTouch 2](https://arxiv.org/abs/2602.09617), Feng et al. 2026.** A tactile encoder for optical sensors that represents short clips of tactile frames. OpenVTLA uses it to turn touch into tokens.
- **[Classifier-free guidance](https://arxiv.org/abs/2207.12598), Ho and Salimans 2022.** Extrapolates from an unconditional prediction towards a conditional one to strengthen the condition. We apply the same rule with touch as the condition.
