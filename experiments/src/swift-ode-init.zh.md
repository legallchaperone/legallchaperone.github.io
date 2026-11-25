## 设置

基线是 [Self Forcing](https://github.com/guandeh17/Self-Forcing) 的 ODE 初始化：在正式蒸馏之前，一个四步的因果视频学生模型先学习回归教师模型的 ODE 轨迹。我们沿用 [CausVid](https://github.com/tianweiy/CausVid) 的流程，数据是 Self Forcing 作者发布的 16k 对轨迹。我们只改回归目标：[Swift](https://www.alphaxiv.org/pdf/2610.25844) 把原始目标 \(y\) 换成 \(y + \alpha\,(y - G_{\text{weak}})\)，其中 \(G_{\text{weak}}\) 是同一个学生模型早期 checkpoint 的输出，参数冻结，\(\alpha = 0.25\)。两组共用前 750 次更新，之后各自训练到 3000 次更新。我们比较两个学生模型的 [VBench](https://github.com/Vchitect/VBench) 分数：一次在 ODE 初始化结束时，一次在 DMD 训练之后。

<details>
<summary>详细说明</summary>

学生模型从 Wan2.1 文生视频 1.3B 的权重出发。它使用 timestep 1000、750、500 和 250，经 shift 5 变换后对应噪声水平 1000、937.5、833.3 和 625。训练使用 AdamW，学习率 2e-6，每次更新 32 个样本，使用四块 GPU。弱模型是共用阶段第 750 次更新的 checkpoint。

每个由三帧 latent 组成的块随机取一个噪声水平。一个块也可以是干净的，即噪声水平为 0。干净的块作为后面各块的上下文，不计入损失。

对每个 checkpoint，我们用一个固定的随机种子生成 VBench 视频，并在全部 16 个维度上评分。

最早的一对 run 在训练中没有干净的上下文块，而采样器在推理时以干净的上下文为条件。我们弃用了这两个 run，实验记录把它们计入其他算力。

</details>

## 实验

### Swift 目标能提高 ODE 初始化后学生模型的 VBench 分数吗？ {#ode testing}

{{figure: vbench-ode}}

### Swift 初始化能提高 DMD 训练之后的 VBench 分数吗？ {#dmd testing}

{{figure: vbench-dmd}}

## 相关工作

- **[Self Forcing](https://arxiv.org/abs/2506.08009)，Huang 等，2025。** 让自回归视频扩散学生模型在自己的 rollout 上训练，使训练与推理一致。它的学生模型从我们这里研究的 ODE 初始化出发。
- **[CausVid](https://github.com/tianweiy/CausVid)，Yin 等，2025。** 把双向视频扩散教师模型蒸馏成少步数的因果学生模型，并在正式蒸馏之前先做 ODE 初始化。我们沿用这一流程，只改回归目标。
- **[Swift](https://www.alphaxiv.org/pdf/2610.25844)。** 我们检验的目标规则。我们把它用在 ODE 初始化上，以学生模型的早期 checkpoint 作为弱模型。
