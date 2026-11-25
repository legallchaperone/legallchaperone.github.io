## Setup

The baseline is the ODE initialization of [Self Forcing](https://github.com/guandeh17/Self-Forcing): before the main distillation, a four-step causal video student learns to regress the ODE trajectories of its teacher. We follow the [CausVid](https://github.com/tianweiy/CausVid) protocol on the 16k trajectory pairs that the Self Forcing authors released. We change the regression target: [Swift](https://www.alphaxiv.org/pdf/2610.25844) replaces the plain target \(y\) with \(y + \alpha\,(y - G_{\text{weak}})\), where \(G_{\text{weak}}\) is the output of a frozen early checkpoint of the same student and \(\alpha = 0.25\). The two arms share their first 750 updates, and each then trains to 3000 updates. We compare the [VBench](https://github.com/Vchitect/VBench) scores of the two students, at the end of the ODE initialization and again after DMD training.

<details>
<summary>Details</summary>

The student starts from the Wan2.1 text-to-video 1.3B weights. It uses the timesteps 1000, 750, 500 and 250, which a shift of 5 warps to the noise levels 1000, 937.5, 833.3 and 625. Training uses AdamW with a learning rate of 2e-6 and 32 samples per update, on four GPUs. The weak model is the shared checkpoint at update 750.

Each block of three latent frames gets one noise level at random. A block may also be clean, at level 0. A clean block serves as context for the later blocks and is left out of the loss.

For each checkpoint we generate the VBench videos with one fixed seed and score them on all 16 dimensions.

A first pair of runs trained without clean context blocks, although the sampler conditions on clean context at inference. We discarded those runs, and the record counts them as other compute.

</details>

## Experiments

### Does the Swift target raise the VBench score of the ODE-initialized student? {#ode testing}

{{figure: vbench-ode}}

### Does a Swift initialization raise the VBench score after DMD training? {#dmd testing}

{{figure: vbench-dmd}}

## Related work

- **[Self Forcing](https://arxiv.org/abs/2506.08009), Huang et al. 2025.** Trains an autoregressive video diffusion student on its own rollouts, so that training matches inference. Its student starts from the ODE initialization that we study here.
- **[CausVid](https://github.com/tianweiy/CausVid), Yin et al. 2025.** Distills a bidirectional video diffusion teacher into a few-step causal student, with an ODE initialization before the main distillation. We keep that protocol and change only the target.
- **[Swift](https://www.alphaxiv.org/pdf/2610.25844).** The target rule that we test. We apply it to the ODE initialization, with an early checkpoint of the student as the weak model.
