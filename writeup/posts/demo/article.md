---
title: A Toy World Model (engine demo)
date: 2026-10-29
description: A four-step generative world model that shows how the diagram and the article move together — encoder, dynamics, decoder and training objective.
draft: true
---

This is the demo article for the diagram writeup engine. The whole diagram is on the left and the text is on the right; as you scroll, the camera moves to the part of the diagram the current section is about.

A world model answers one question: **given what we see now, \(o_t\), and the action we take, \(a_t\), what will we see next?** We split the answer into four steps.

## Encoder: compress the image into a latent {#encoder}

The observation \(o_t\) is a \(64 \times 64\) image. Predicting the future directly in pixel space is expensive and unstable, so an encoder first compresses it into a low-dimensional latent \(z_t\).

The encoder outputs a distribution rather than a single point:

$$
q_\phi(z_t \mid o_t) = \mathcal{N}\big(\mu_\phi(o_t),\ \operatorname{diag}\sigma^2_\phi(o_t)\big)
$$

That lets us later align it with the dynamics model's prediction through a KL term. Open the two components below for details.

### Patchify {#encoder/patchify}

The image is cut into \(3 \times 3\) patches; each patch is flattened and passed through a linear layer, giving a sequence of tokens:

```python
patches = image.unfold(2, 21, 21).unfold(3, 21, 21)   # (B, C, 3, 3, 21, 21)
tokens = proj(patches.flatten(-3))                     # (B, 9, d)
## this line is inside a code block, so it is not a section heading
```

With patches, the network only has to handle 9 tokens instead of 4096 pixels.

### Posterior {#encoder/posterior}

The posterior network reads the tokens and outputs a mean and a log-variance. Sampling uses the reparameterization trick so gradients can flow through the randomness:

$$
z_t = \mu + \sigma \odot \epsilon, \qquad \epsilon \sim \mathcal{N}(0, I)
$$

## Dynamics: one step forward in latent space {#dynamics}

Given \(z_t\), the dynamics model predicts the next latent state from the action \(a_t\):

$$
z_{t+1} = f_\theta(z_t, a_t)
$$

This step happens entirely in latent space, so the model can cheaply "imagine" many steps ahead without generating an image at each one.

### Transition {#dynamics/transition}

\(f_\theta\) is a small MLP (or GRU). The action is embedded as a vector and concatenated with \(z_t\):

- Input: \([z_t;\ \mathrm{embed}(a_t)]\)
- Output: the mean and variance of \(z_{t+1}\)

### Prior {#dynamics/prior}

During training the same \(z_{t+1}\) comes from two places: the posterior, encoded from the real next frame \(o_{t+1}\), and the prior imagined by the dynamics model, \(p_\theta(z_{t+1} \mid z_t, a_t)\). The KL between the two is the regularizer in step four.

## Decoder: turn the latent back into an image {#decoder}

The decoder \(g_\phi\) maps \(z_{t+1}\) back to an image \(\hat o_{t+1}\). It is only needed for training; planning can happen entirely in latent space.

> The decoder decides whether the "imagination" is readable by people, but not necessarily how good the plans are.

## Training objective {#objective}

Putting the steps together gives a sequential evidence lower bound (ELBO):

$$
\mathcal{L} = \sum_t \Big( \underbrace{\mathbb{E}_{q}\big[\log p(o_t \mid z_t)\big]}_{\text{reconstruction}} - \beta\, \underbrace{\mathrm{KL}\big(q(z_t \mid o_t)\,\|\,p_\theta(z_t \mid z_{t-1}, a_{t-1})\big)}_{\text{prior matching}} \Big)
$$

\(\beta\) balances the two terms: too large and the latent remembers nothing; too small and the dynamics learn nothing.
