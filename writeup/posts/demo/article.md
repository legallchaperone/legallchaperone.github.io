---
title: 一个玩具世界模型（引擎演示）
date: 2026-10-29
description: 用一个四步的生成式世界模型演示"画布 + 文章"联动：编码、动力学、解码、训练目标。
draft: true
---

这是图解写作引擎的演示文章。左边是整张图，右边是正文；往下滚动时，镜头会移到当前章节在图上对应的区域。

世界模型要回答的问题是：**给定现在看到的 \(o_t\) 和要做的动作 \(a_t\)，下一刻会看到什么？** 我们把它拆成四步。

## 编码器：把图像压成隐变量 {#encoder}

观测 \(o_t\) 是一张 \(64 \times 64\) 的图像。直接在像素空间里预测未来又贵又不稳定，所以先用编码器把它压成一个低维的隐变量 \(z_t\)。

编码器输出的不是一个点，而是一个分布：

$$
q_\phi(z_t \mid o_t) = \mathcal{N}\big(\mu_\phi(o_t),\ \operatorname{diag}\sigma^2_\phi(o_t)\big)
$$

这样做的好处是，后面可以用 KL 散度把它和动力学模型的预测对齐。展开下面两个子组件看细节。

### 切块 {#encoder/patchify}

图像先被切成 \(3 \times 3\) 的小块，每块展平后过一个线性层，得到一串 token：

```python
patches = image.unfold(2, 21, 21).unfold(3, 21, 21)   # (B, C, 3, 3, 21, 21)
tokens = proj(patches.flatten(-3))                     # (B, 9, d)
## 这一行在代码块里，不会被当成章节标题
```

切块让后面的网络只需要处理 9 个 token，而不是 4096 个像素。

### 后验 {#encoder/posterior}

后验网络读入 token，输出均值和对数方差。采样时用重参数化技巧，让梯度能穿过随机性：

$$
z_t = \mu + \sigma \odot \epsilon, \qquad \epsilon \sim \mathcal{N}(0, I)
$$

## 动力学：在隐空间里往前走一步 {#dynamics}

有了 \(z_t\)，动力学模型根据动作 \(a_t\) 预测下一刻的隐状态：

$$
z_{t+1} = f_\theta(z_t, a_t)
$$

这一步完全发生在隐空间里，所以可以很便宜地连续"想象"很多步，而不用每一步都生成图像。

### 转移函数 {#dynamics/transition}

\(f_\theta\) 是一个小的 MLP（或 GRU）。动作先嵌入成向量，再和 \(z_t\) 拼在一起：

- 输入：\([z_t;\ \mathrm{embed}(a_t)]\)
- 输出：\(z_{t+1}\) 的均值和方差

### 先验 {#dynamics/prior}

训练时，同一个 \(z_{t+1}\) 有两种来源：从真实下一帧 \(o_{t+1}\) 编码得到的后验，和动力学模型想象出来的先验 \(p_\theta(z_{t+1} \mid z_t, a_t)\)。两者之间的 KL 就是第四步里的正则项。

## 解码器：把隐变量变回图像 {#decoder}

解码器 \(g_\phi\) 把 \(z_{t+1}\) 还原成图像 \(\hat o_{t+1}\)。它只在训练时需要；真正规划的时候，可以完全在隐空间里进行。

> 解码器的质量决定了"想象"能不能被人看懂，但不一定决定规划的好坏。

## 训练目标 {#objective}

把上面几步合起来，就是一个序列版本的变分下界（ELBO）：

$$
\mathcal{L} = \sum_t \Big( \underbrace{\mathbb{E}_{q}\big[\log p(o_t \mid z_t)\big]}_{\text{重建}} - \beta\, \underbrace{\mathrm{KL}\big(q(z_t \mid o_t)\,\|\,p_\theta(z_t \mid z_{t-1}, a_{t-1})\big)}_{\text{先验对照}} \Big)
$$

\(\beta\) 控制两项的平衡：\(\beta\) 太大，隐变量什么都不记；太小，动力学学不到东西。
