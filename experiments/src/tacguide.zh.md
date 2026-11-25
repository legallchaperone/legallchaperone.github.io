能通过触觉传感器感受物体的机器人策略，可以用来教一个只能看的策略。这一页检验两者之间的差异能否被放大，做法与 classifier-free guidance 放大文本提示的作用相同。

## 设置

基线是随 [OpenViTac](https://github.com/FVL-Repo/OpenViTac) benchmark 发布的策略 OpenVTLA：在 π0.5 的视觉 token 之前加入 AnyTouch 2 提取的触觉 token，按官方配方用 flow matching 训练。我们在同一批演示上再训练一个纯视觉的 π0.5，并把两者预测的速度组合为 \(v = v_{\text{vision}} + w\,(v_{\text{touch}} - v_{\text{vision}})\)，其中 \(w = 1\) 就是带触觉的策略，\(w > 1\) 则向外推。这个组合可以在测试时直接使用，也可以蒸馏进一个纯视觉学生，学生不再需要触觉传感器。所有策略都在官方发布的 Grasp Chip 演示上训练 1 万步，每步 64 个样本。指标是 OpenViTac 仿真器中的闭环成功率，由 benchmark 自带的任务判定给出。代码是 [OpenViTac 的一个 fork](https://github.com/legallchaperone/TacGuide)，实验记录里给出了每个 run 开始时所用的 commit。

<details>
<summary>详细说明</summary>

带触觉的策略输入两路相机图像，以及两个指尖传感器各四帧的触觉片段。纯视觉策略只输入两路相机图像。与官方配置一致，所有策略都不输入机器人的关节状态。

策略每次预测 50 个动作。仿真器执行前 20 个，然后请求新的预测。

蒸馏学生与纯视觉策略从相同的权重出发，使用相同的优化器。每个训练步里，冻结的带触觉策略和学生看到同样增强后的图像，学生回归教师的速度。

新场景指仿真器用演示采集范围之外的种子采样出的场景。训练场景使用的种子则落在演示采集的范围之内。

仿真器大约每三次启动就有一次处于异常状态。只有在第一步时两张触觉图像的标记点齐全、腕部图像亮度与训练数据一致的 episode 才会保留，否则重跑。

</details>

## 实验

### 训练 1 万步后，各策略完成 Grasp Chip 的频率有多高？ {#closed-loop answered}

几乎从不：带触觉的策略只完成了一个 episode，纯视觉策略和蒸馏学生一个都没有完成。失败的 episode 里包括训练演示中出现过的场景。

{{figure: success}}

训练损失看不出这种失败。两个用演示训练的策略都平稳收敛。

{{figure: loss}}

<details>
<summary>详细说明</summary>

benchmark 仓库里有一个[未关闭的 issue](https://github.com/FVL-Repo/OpenViTac/issues/5)，报告其作者试过的所有学习策略在这个任务上都是 50 次里 0 次成功。他们认为原因是成功判定中的两个容差过严，而脚本专家从不会接近这两个容差。

</details>

### 失败的抓取错在哪里？ {#miss testing}

我们测量夹爪第一次落下时离芯片中心有多远。

{{figure: miss}}

<details>
<summary>详细说明</summary>

在演示中机械臂静止的帧上，每个预测的 action chunk 仍会让三个关节移动约 1 mrad，使夹爪偏移约 0.4 mm。这个偏移与 chunk 内的位置、采样的噪声、数值精度以及去噪步数都无关。策略每 20 步重新规划一次，又看不到关节状态，因此无法察觉这种漂移。

仿真器对指令的执行是精确的：自由运动时，指令关节角与实际到达的关节角一致。

不启用渲染器的超分辨率时，相机图像比训练数据更亮、更锐，在更早的一轮评测中使预测的抓取位置最多偏了 27 mm。本页的每个 episode 都通过了第一帧的亮度检查。

演示里没有第二次尝试。

</details>

### 训练到 2 万步能让夹爪落到芯片上吗？ {#longer testing}

OpenViTac 论文训练 2 万步，而发布的代码默认 1 万步。

{{figure: loss-20k}}

{{figure: success-20k}}

### 同样的两个策略能完成 Gear Assembly 吗？ {#gear testing}

{{figure: success-gear}}

### 触觉引导能提高纯视觉策略的成功率吗？ {#guidance testing}

{{figure: success-guidance}}

## 结论

## 相关工作

- **[OpenViTac](https://arxiv.org/abs/2610.10384)，Wu 等，2026。** 一个包含 11 个视触觉操作任务的仿真 benchmark，并配有对应的真机任务，同时发布了 OpenVTLA 策略。我们带触觉的策略就是按官方配方训练的 OpenVTLA，所有评测都使用它的仿真器。
- **[π0.5](https://arxiv.org/abs/2504.16054)，Physical Intelligence，2025。** 用 flow matching 生成 action chunk 的 vision-language-action 模型。本页所有策略都以它为骨干。
- **[AnyTouch 2](https://arxiv.org/abs/2602.09617)，Feng 等，2026。** 面向光学触觉传感器的编码器，对短的触觉帧片段做表征。OpenVTLA 用它把触觉变成 token。
- **[Classifier-free guidance](https://arxiv.org/abs/2207.12598)，Ho 和 Salimans，2022。** 从无条件预测向有条件预测外推，以加强条件的作用。我们用同样的规则，把触觉当作条件。
