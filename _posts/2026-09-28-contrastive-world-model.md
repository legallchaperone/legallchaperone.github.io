---
layout: post
title: "Contrastive World Model"
date: 2026-09-28
description: "Paper notes on Contrastive World Models (Li, 2026): drop Dreamer's pixel decoder, keep the RSSM, and learn the state with InfoNCE over future patch features."
tags: paper-reading
toc:
  beginning: true
related_posts: false
---

Bonnie Li, [arXiv:2609.22175](https://arxiv.org/abs/2609.22175) (2026). Group meeting, 28.09.26.

## Overview

<div class="row mt-3">
<div class="col-sm-6 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/cwm-fig1-overview.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div>
<div class="col-sm-6 mt-3 mt-md-0" markdown="1">

- Reconstruction-based world models (Dreamer) spend capacity on **task-irrelevant pixels**
- CWM keeps the RSSM, **removes the pixel decoder**, and maximizes MI between state-action sequences and local features of **future** observations
- Robust to visual distractors, cheaper to train

</div>
</div>

## 1. Latent Dynamics Model

### Partially Observable Markov Decision Process

<div class="row mt-3">
<div class="col-sm-6 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/planet-fig1-latent-dynamics.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div>
<div class="col-sm-6 mt-3 mt-md-0" markdown="1">

**Transition** $$p(s_t\mid s_{t-1},a_{t-1})$$  
**Observation** $$p(o_t\mid s_t)$$  
**Reward** $$p(r_t\mid s_t)$$  
**Encoder** $$q(s_t\mid s_{t-1},a_{t-1},o_t)$$

</div>
</div>

PlaNet Fig. 1 (Hafner et al., 2019). Circles: stochastic, squares: deterministic, gray: observed; solid: generative model $$p$$, dashed: inference model $$q$$.

Goal: maximize $$\ln p(o_{1:T},r_{1:T}\mid a_{1:T})$$.

### Evidence lower bound

$$
\begin{aligned}
\ln p(o_{1:T},r_{1:T}\mid a_{1:T})
&= \ln\mathbb{E}_{q}\left[\frac{p(o_{1:T},r_{1:T},s_{1:T}\mid a_{1:T})}{q(s_{1:T}\mid o_{1:T},a_{1:T})}\right]\\
&\geq \mathbb{E}_q\big[\ln p(o_{1:T},r_{1:T},s_{1:T}\mid a_{1:T})-\ln q(s_{1:T}\mid o_{1:T},a_{1:T})\big] \qquad \text{(Jensen)}\\
&= \mathbb{E}_q\Big[\sum_t\big(\ln p(o_t\mid s_t)+\ln p(r_t\mid s_t)+\ln p(s_t\mid s_{t-1},a_{t-1})-\ln q(s_t\mid s_{t-1},a_{t-1},o_t)\big)\Big]\\
&= \mathbb{E}_q\Big[\sum_t\big(\ln p(o_t\mid s_t)+\ln p(r_t\mid s_t)-\mathrm{KL}\big(q(s_t\mid s_{t-1},a_{t-1},o_t)\ \Vert\ p(s_t\mid s_{t-1},a_{t-1})\big)\big)\Big]
\end{aligned}
$$

$$
\text{ELBO}=\mathbb{E}\Big[\sum_t\big(\underbrace{J_O^t}_{\text{Reconstruction}}+\underbrace{J_R^t}_{\text{Reward prediction}}+\underbrace{J_D^t}_{\text{Regularization}}\big)\Big]
$$

Used decompositions:

$$
q(s\mid o,a)=\prod_{t=1}^{T}\underbrace{q(s_t\mid s_{t-1},a_{t-1},o_t)}_{\text{Encoder}}
\qquad
p(o,r,s\mid a)=\prod_{t=1}^{T}\underbrace{p(s_t\mid s_{t-1},a_{t-1})}_{\text{Transition}}\ \underbrace{p(o_t\mid s_t)}_{\text{Observation}}\ \underbrace{p(r_t\mid s_t)}_{\text{Reward}}
$$

## 2. Original Dreamer

### Algorithm (Hafner et al., 2020)

<div class="row mt-3">
<div class="col-sm-6 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/dreamer-algorithm1.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div>
<div class="col-sm-6 mt-3 mt-md-0" markdown="1">

**Dynamics learning**: representation learning on real data, update world model $$\theta$$  
**Behavior learning**: actor-critic in imagination; actions from actor $$\phi$$, rewards from reward model, value $$\psi$$  
**Environment interaction**: collect new episodes with actor + exploration noise

</div>
</div>

Dreamer swaps $$p/q$$ vs. CWM: here $$p$$ = representation, $$q$$ = transition / reward.

### Representation learning: three options

| Option            | Objective                                                                                              | Result                             |
| ----------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Reconstruction    | $$J_{\mathrm{REC}}=\mathbb{E}_q\big[\sum_t(J_O^t+J_R^t+J_D^t)\big]$$                                   | Best                               |
| Contrastive       | $$J_O^t\leftarrow J_S^t=\ln\frac{p(s_t\mid o_t)}{\sum_{o'}p(s_t\mid o')}$$ (InfoNCE); rest is the same | Few tasks close to Rec, most worse |
| Reward prediction | $$J_R^t+J_D^t$$ (no $$J_O$$)                                                                           | Failed mostly                      |

## 3. Contrastive World Model

### Architecture

<div class="row mt-3"><div class="col-sm mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/cwm-fig2-architecture.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div></div>

Fig. 2: RSSM (left) and Contrastive World Model (right). $$e$$: encoder, $$g$$: update (posterior $$s_t$$), $$f$$: transition (prior $$\hat s_{t+1}$$), $$R$$: reward.

### Maximizing mutual information lower bound

$$
\begin{aligned}
\mathbb{E}_q[\ln p(o_t\mid s_t)]\ &\doteq\ \mathbb{E}_q\big[\ln p(o_t\mid s_t)-\underbrace{\ln p(o_t)}_{\text{constant}}\big]\\
&\overset{\text{Bayes}}{=}\ \mathbb{E}_q\Big[\ln\frac{p(o_t,s_t)}{p(o_t)\ p(s_t)}\Big]\ =\ I(o_t;s_t)
\end{aligned}
$$

**Idea: learn temporally dependent representations** (a design choice, jump in logic):

$$
\max_\theta\ I\big([s_t,a_{t:t+h}];\ o_{t+h}\big)\ \geq\ \mathbb{E}\Big[\ln\frac{f_\theta([s_t,a_{t:t+h}],\ o_{t+h})}{\sum_{t'}f_\theta([s_t,a_{t:t+h}],\ o_{t'})}\Big]
$$

### InfoNCE with patch features

$$f_\theta$$: a score function that preserves mutual information, i.e. $$\displaystyle f_\theta(x_{t+h},c_t)\ \propto\ \frac{p(x_{t+h}\mid c_t)}{p(x_{t+h})}$$
Here: a bilinear score $$\ f_\theta(x_{t+h},c_t)=\exp\big(c_t^{\top}W_\theta\ x_{t+h}\big)$$

$$
\max_\theta I\big([s_t,a_{t:t+h}];o_{t+h}\big)\ \geq\ \mathbb{E}_{\underbrace{T}_{\text{time}},\underbrace{B}_{\text{batch}}}\left(\frac{1}{M}\frac{1}{N}\sum_m\sum_n\ln\frac{\exp\big([s_t,a_{t:t+h}]^{\top}W_\theta\ \overbrace{e_{m,n}(o_{t+h})}^{\text{patch embedding } m\times n}\big)}{\sum_{b\in B}\exp\big([s_t,a_{t:t+h}]^{\top}W_\theta\ e_{m,n}(o_b)\big)}\right)
$$

### Training objective

$$
J_I^t=\frac{1}{M}\frac{1}{N}\sum_m\sum_n\ln\frac{\exp\big([s_t,a_{t:t+h}]^{\top}W_\theta\ e_{m,n}(o_{t+h})\big)}{\sum_{b\in B}\exp\big([s_t,a_{t:t+h}]^{\top}W_\theta\ e_{m,n}(o_b)\big)}\qquad\text{(Representation)}
$$

$$
\begin{aligned}
J_R^t&=\ln p_\theta(r_t\mid s_t) && \text{(reward prediction)}\\
J_D^t&=-\mathrm{KL}\big(q(s_{t+1}\mid s_t,a_t,o_{t+1})\ \Vert\ f(\hat s_{t+1}\mid s_t,a_t)\big) && \text{(regularization)}\\
J_{\mathrm{DIM}}&=\mathbb{E}\Big[\frac{1}{T}\sum_t\big(J_I^t+\lambda_1J_D^t+\lambda_2J_R^t\big)\Big]
\end{aligned}
$$

## 4. Experiments

### Setup

<div class="row mt-3">
<div class="col-sm-6 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/cwm-fig3-settings.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div>
<div class="col-sm-6 mt-3 mt-md-0" markdown="1">

- Default: DMC, stationary background
- Simple distractor: moving colored balls
- Natural video: Kinetics background, full color (DBC used grayscale)
- finger-spin, cheetah-run, walker-walk
- 1M env steps, 3 seeds

</div>
</div>

Fig. 3: default (upper left), simple distractor (upper right), natural video (bottom).

### Baselines

<div class="row mt-3">
<div class="col-sm-6 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/mp-baseline-diagram.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div>
<div class="col-sm-6 mt-3 mt-md-0" markdown="1">

- **Dreamer**: pixel reconstruction ($$J_O$$)
- **Momentum Prediction**: BYOL / MPR-style; $$\varphi_\theta(s_t)$$ predicts the EMA-encoder embedding of $$o_{t+h}$$
  - ≈ JEPA: predict a future embedding; EMA target + stop-grad; no negatives, no decoder
  - differs: cosine loss; $$\varphi_\theta$$ sees no $$a_{t:t+h}$$ (CWM does)
  - $$J_{\mathrm{MP}}^t=\cos\big(\varphi_\theta(s_t),\ \mathrm{sg}(e_\xi(o_{t+h}))\big)$$, $$\ \xi\leftarrow\tau\xi+(1-\tau)\theta$$

</div>
</div>

All three share the RSSM and the actor-critic; they differ only in the representation objective:

| Stage                                 | Dreamer                     | MP                  | CWM     |
| ------------------------------------- | --------------------------- | ------------------- | ------- |
| Dynamics learning (only this changes) | $$J_O$$                     | $$J_{\mathrm{MP}}$$ | $$J_I$$ |
| Behavior learning                     | actor-critic in imagination | same                | same    |
| Environment interaction               | collect data with actor     | same                | same    |

### Results

Blue: Dreamer, red: InfoMax (CWM), green: Momentum Prediction.

**Default DMC setting** (Fig. 4)

<div class="row mt-3"><div class="col-sm mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/cwm-fig4-default.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div></div>

- All three reach comparable asymptotic performance
- Clean observations: reconstruction is a sufficient signal; BYOL-style also works

**Simple distractor setting** (Fig. 5)

<div class="row mt-3"><div class="col-sm mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/cwm-fig5-distractor.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div></div>

- InfoMax ≥ Dreamer on cheetah-run and walker-walk; Dreamer better on finger-spin
- Momentum Prediction collapses on all three tasks

**Natural video setting** (Fig. 6)

<div class="row mt-3"><div class="col-sm mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/cwm-fig6-natural.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div></div>

- InfoMax substantially outperforms both baselines on every task
- Dreamer and Momentum Prediction stay near random; no pixel decoder → faster wall-clock per step

## 5. Discussion

### Relation to JEPA: how to avoid collapse without pixels

| Objective                            | $$s_t$$ must ...                              | Anti-collapse          | Under distractors                |
| ------------------------------------ | --------------------------------------------- | ---------------------- | -------------------------------- |
| Reconstruction (Dreamer)             | reproduce every pixel of $$o_t$$              | decoder anchors latent | degrades; fails on natural video |
| Latent prediction (MP ≈ JEPA / BYOL) | regress the target embedding of $$o_{t+h}$$   | EMA + stop-grad        | fails                            |
| Latent prediction (LeWM, JEPA)       | regress the next embedding                    | Gaussian regularizer   | not tested (clean domains)       |
| Contrastive (CWM)                    | pick the true $$o_{t+h}$$ among batch samples | negatives              | robust                           |

- MP (JEPA-like): target embedding also encodes distractor motion → predicting it is an easy shortcut (authors' hypothesis)
- Local patches: every region of $$o_{t+h}$$ must be identifiable → no shortcut through one salient feature (authors' hypothesis)

### Relation with JEPA (community discussion)

<div class="row mt-3">
<div class="col-sm-6 mt-3 mt-md-0">
{% include figure.liquid loading="eager" path="assets/img/posts/cwm/jepa-twitter-thread.png" class="img-fluid rounded z-depth-1" zoomable=true %}
</div>
<div class="col-sm-6 mt-3 mt-md-0" markdown="1">

**Future questions**
(1) Add JEPA baselines
(2) Stochastic → deterministic?

</div>
</div>

### Implications & ideas

1. **Add JEPA-family baselines.** Momentum Prediction is only a weak JEPA proxy (cosine loss, no action conditioning); compare against action-conditioned JEPA world models, e.g., LeWM, DINO-WM.
2. **More data, harder distractors.** Beyond 3 DMC tasks: AdaJEPA-style OOD shifts, e.g., PushT unseen shapes, per-frame corruption (blur, noise), color shift; PointMaze dynamics / layout shift.
3. **Inspect the representation geometry** (idea from Zekai). Visualize and measure clustering (t-SNE / UMAP, cluster statistics): do similar states crowd together and lose fine-grained, control-relevant differences?
4. **InfoNCE as the test-time adaptation loss.** Negatives from the test batch give an anti-collapse signal that a pure prediction loss lacks.
5. **Action-free pretraining** (authors' future work). Drop actions from the context → pretrain on unlabeled video, then fine-tune with actions.

## Q&A

> Some answers are generated by Claude Opus 5.5

### What is $$g$$ in the CWM architecture figure?

The **update function**, i.e. the posterior (the encoder $$q$$ in the ELBO). It takes the prior state feature $$\hat s_t$$ and the image embedding $$z_t=e(o_t)$$ and outputs the posterior state $$s_t$$:

$$
s_t=g(z_t,\ \hat s_t),\qquad \hat s_t=f(s_{t-1},a_{t-1})
$$

In the standard RSSM: $$[\mu_q,\sigma_q]=\mathrm{MLP}([h_t,z_t])$$, then sample $$s_t\sim\mathcal N(\mu_q,\sigma_q)$$. It works like a learned Kalman update: $$f$$ predicts, $$g$$ corrects with the observation. The KL term keeps the posterior close to the prior, so $$g$$ only adds what $$f$$ could not predict. $$g$$ is used only on real data (training, acting in the environment); imagination rolls out $$f$$ alone.

### What is $$h$$, and what is it for?

$$h_t$$ is the **deterministic recurrent state** of the RSSM (the GRU hidden state):

$$
h_t=\mathrm{GRU}\big(h_{t-1},\ [s_{t-1},a_{t-1}]\big)
$$

It is the model's **memory**: a summary of the whole history $$(s_{<t},a_{<t})$$ that is carried forward without sampling noise. PlaNet (Fig. 1) motivates it: a purely stochastic SSM finds it hard to remember information over many steps, and a purely deterministic RNN cannot represent multiple possible futures. The RSSM keeps both: $$h$$ for memory, $$s$$ for uncertainty. Prior, posterior, reward head and decoder (or InfoNCE context) are all conditioned on $$h_t$$.

Not to be confused with the **horizon** $$h$$ in $$a_{t:t+h}$$ and $$o_{t+h}$$ (the paper reuses the letter).

### How is $$h$$ different from $$s$$?

|                    | $$h_t$$                                | $$s_t$$                                      |
| ------------------ | -------------------------------------- | -------------------------------------------- |
| Type               | deterministic                          | stochastic (sampled)                         |
| Computed from      | past only: $$h_{t-1},s_{t-1},a_{t-1}$$ | $$h_t$$ (prior), plus $$o_t$$ (posterior)    |
| Sees current image | no                                     | posterior yes, prior no                      |
| KL penalty         | none (shared by prior and posterior)   | $$\mathrm{KL}(q\ \Vert\ p)$$ on $$s_t$$ only |
| Role               | long-term memory                       | uncertainty; new information from $$o_t$$    |

Information from the image can only enter through the stochastic posterior $$s_t$$ (and is paid for by the KL); $$h$$ only carries forward what has already entered. The "state" the paper feeds to InfoNCE, the reward head and the actor is the concatenation $$[h_t,s_t]$$.

### How is $$h$$ different from the encoder?

The encoder $$e$$ is a **network** (CNN) that maps one image to an embedding, $$z_t=e(o_t)$$, with no memory. $$h_t$$ is a **state variable** that integrates the past and never sees $$o_t$$. They meet in $$g$$: the posterior combines "what I expected" ($$h_t$$, via the prior) with "what I see" ($$z_t$$). In the ELBO, "encoder $$q$$" means this whole path $$e\to g$$, not $$e$$ alone.

### Why is there no $$h$$ in the derivation or in Fig. 2?

The derivation uses SSM notation, as Dreamer does; the implementation is an RSSM. Since $$h_t$$ is a deterministic function of $$(s_{<t},a_{<t})$$ and is shared by prior and posterior, the ELBO keeps the same form with no extra KL: read $$(s_{t-1},a_{t-1})$$ as $$h_t$$, and $$s_t$$ in the InfoNCE term as $$[h_t,s_t]$$. Fig. 2 is a computation graph, not a graphical model: $$h$$ lives inside $$f$$ (the GRU) and is passed along the $$f\to f$$ arrow, and it is part of the "state features".

### Why do the last two ELBO terms become a KL?

$$\mathrm{KL}(q\ \Vert\ p)=\mathbb{E}_{x\sim q}\big[\ln q(x)-\ln p(x)\big]$$. By the Markov structure of $$q$$:

$$
\begin{aligned}
&\mathbb{E}_{q(s_{1:T})}\big[\ln p(s_t\mid s_{t-1},a_{t-1})-\ln q(s_t\mid s_{t-1},a_{t-1},o_t)\big]\\
&= \mathbb{E}_{q(s_{t-1})}\Big[\mathbb{E}_{q(s_t\mid s_{t-1},a_{t-1},o_t)}\big[\ln p(s_t\mid\cdot)-\ln q(s_t\mid\cdot)\big]\Big]
= \mathbb{E}_{q(s_{t-1})}\Big[-\mathrm{KL}\big(q(s_t\mid\cdot)\ \Vert\ p(s_t\mid\cdot)\big)\Big]
\end{aligned}
$$

The KL integrates out only $$s_t$$; it is still a function of $$s_{t-1}$$, so it stays inside the outer expectation.

### Is Eq. (1) really "="?

Only for the optimal decoder. With a learned decoder $$p_\theta$$ (Barber–Agakov):

$$
\mathbb{E}[\ln p_\theta(o_t\mid s_t)-\ln p(o_t)] = I(o_t;s_t)-\mathbb{E}\big[\mathrm{KL}(\tilde p(o\mid s)\ \Vert\ p_\theta(o\mid s))\big]\ \le\ I(o_t;s_t)
$$

Reconstruction and InfoNCE are two different lower bounds on the same MI.

### Why does the InfoNCE bound hold?

1. NWJ: for any $$g$$, $$I(X;Y)\ge\mathbb{E}_{p(x,y)}[g]-\mathbb{E}_{p(x)p(y)}[e^{g-1}]$$, since pointwise $$rg-e^{g-1}\le r\ln r$$.
2. Negatives $$y_{2:K}\sim p(y)$$ are independent, so $$I(X;Y_1)=I((X,Y_{2:K});Y_1)$$. With $$g=1+\ln\frac{f(x,y_1)}{\frac1K\sum_k f(x,y_k)}$$ the second term equals 1 by exchangeability:

$$
I(X;Y)\ \ge\ \ln K+\mathbb{E}\Big[\ln\frac{f(x,y_1)}{\sum_{k=1}^K f(x,y_k)}\Big]
$$

3. $$e_{m,n}(o_{t+h})$$ is a function of $$o_{t+h}$$ (data processing), so each patch bound is $$\le I$$, and so is their average.

The paper drops the constant $$\ln K$$ (still valid, looser); the denominator must include the positive; the bound is capped at $$\ln K$$ with batch size $$K$$.

### Isn't contrastive learning very hard to train?

It can be. The usual difficulties, and where CWM stands on each:

| Difficulty                 | Why it happens                                                            | In CWM                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Needs many negatives       | The bound is capped at $$\ln K$$; with few negatives the signal saturates | Negatives come from the batch. Dreamer's default batch is 50 sequences of 50 steps, so up to about 2500 frames if all are used (the paper does not say). Each sample also gives $$M\times N$$ patch-level problems |
| Designing positives        | Image methods (SimCLR, MoCo) depend on hand-picked augmentations          | Positives come free from time: the future frame given the actions, as in CPC                                                                                                                                       |
| False negatives            | A "negative" may actually match the context                               | Other frames of the same episode can look alike; batch negatives from other episodes mostly avoid this                                                                                                             |
| Critic scale / temperature | Softmax sharpness strongly affects gradients                              | The norm of $$W_\theta$$ acts as a learned temperature; not reported                                                                                                                                               |
| Shortcuts                  | The easiest discriminative feature wins                                   | Background identity across episodes (see the background question); local patches reduce it                                                                                                                         |

Why it is workable here:

- The goal is a useful representation, not a tight MI estimate. InfoNCE gives good gradients even when the bound is loose, and tighter MI bounds do not reliably give better representations (Tschannen et al., 2020).
- The KL and reward terms, and the RSSM structure, add training signal beyond the contrastive term.
- Compared with the alternatives: reconstruction is stable but spends capacity on pixels; JEPA/BYOL-style prediction needs EMA and stop-grad and can collapse (Momentum Prediction did here). Contrastive learning does not collapse; its failure modes are weak signal and shortcuts.

What the paper does not show: sensitivity to batch size (number of negatives), $$h$$, $$M\times N$$, or $$\lambda_1,\lambda_2$$; results use only 3 seeds, and the natural-video curves (e.g., cheetah-run) have high variance. Hafner et al. (2020) found their contrastive Dreamer variant underperformed reconstruction, so stable training is not automatic.

### How does Dreamer's NCE differ from CWM's InfoNCE?

|                      | Dreamer NCE                            | CWM                                                 |
| -------------------- | -------------------------------------- | --------------------------------------------------- |
| Positive pair        | $$s_t\leftrightarrow o_t$$ (same step) | $$[s_t,a_{t:t+h}]\leftrightarrow o_{t+h}$$ (future) |
| Actions              | no                                     | yes                                                 |
| Critic               | state-model density $$q(s_t\mid o_t)$$ | bilinear $$c^\top W e$$                             |
| Observation features | whole image                            | $$M\times N$$ local patches                         |

Same-step pairing has a shortcut: the posterior $$s_t=g(z_t,\hat s_t)$$ has already seen $$o_t$$, so it can copy whatever makes $$o_t$$ identifiable (often the background). The future frame cannot be copied, only predicted.

### Why doesn't CWM learn the background dynamics?

Strictly, nothing in the objective forbids it, and the paper does not measure it (no probing, no ablation). What the objective changes is how much the background **dominates** the representation:

1. **Reconstruction scales with pixels; InfoNCE saturates.** Dreamer's loss sums over every pixel, and the background is most of a $$64\times64$$ frame, so most of the gradient and capacity go to it. InfoNCE is a softmax classification: once a patch is easy to tell apart from the negatives, its loss is near zero and stops pulling. The remaining gradient comes from the hard part, the agent, whose future depends on $$a_{t:t+h}$$.
2. **Only predictable information pays off.** The context $$[h_t,s_t,a_{t:t+h}]$$ is scored against the **future** frame $$o_{t+h}$$. Random distractor motion and natural-video content (camera motion, cuts) are only weakly predictable $$h$$ steps ahead, while the agent's pose is predictable from state and actions.
3. **The KL bottleneck charges for unpredictable information.** New information enters only through the posterior $$s_t$$ and costs $$\mathrm{KL}(q\ \Vert\ p)$$; background changes the prior cannot predict are expensive to encode.
4. **The reward head** only needs agent state, which adds pressure toward task-relevant features (Dreamer has this too, so it is not the difference).

Caveat: natural video **is** temporally correlated, and negatives from other episodes have different backgrounds, so "which background is this" is a cheap way to identify the positive. The representation very likely still contains background information; the claim is only that it no longer crowds out the agent. Ways to check: a linear probe from $$[h_t,s_t]$$ to background features, and same-episode negatives (same background, other times) to remove the shortcut.

---

Prepared with the help of Claude (Anthropic): layout from the presenter's handwritten notes; LaTeX typesetting; Figures 1–6 from the original paper (Li, 2026); Momentum Prediction diagram drawn from the paper's text; discussion points drafted with the AI and edited by the presenter. The Q&A section adds explanations that are not on the slides.
