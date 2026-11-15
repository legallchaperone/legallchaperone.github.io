*Generative Models, part 3 of 3. Previous: [Optimal Transport](/blog/post.html?f=2026-11-14-optimal-transport.md).*

Notes on [STAD80 Lecture 09](https://nexais.github.io/stad80/lectures/slides09.pdf). Convention here: \(t = 0\) clean data, \(t = 1\) pure noise (the reverse of the usual flow-matching convention). \(\hat x_t = \alpha_t G_\theta(z) + \beta_t\varepsilon\).

## Two levels

**Goal:** replace many teacher steps with a few student steps. The student \(G_\theta\) is a transport map: \((G_\theta)_\# p_{\text{noise}} \approx p_{\text{data}}\).

|  | flow-map level | distribution level |
| --- | --- | --- |
| teacher provides | a specific coupling \((x_1, \Psi_{1\to0}(x_1))\) | only the target distribution (via its score) |
| constraint | coupling fixed: \(G_\theta(x_1) \approx \Psi_{1\to0}(x_1)\) | marginal only: \((G_\theta)_\# p_1 = p_0\) |
| training | regression | divergence minimization |
| transport plan | must be the teacher's | any |
| examples | KD, PD, consistency models | VSD, DMD, DMD2, f-distill |

- Flow-map level: stable, but student quality is capped by the teacher's path.
- Distribution level = inverse problem "find \(f\) with \(f_\#P = Q\)" ([part 1](/blog/post.html?f=2026-11-14-gans.md)); \(f\) not unique, so the student can pick its own plan.
- Few-step student = composition of jumps \(G_4\circ G_3\circ G_2\circ G_1\), like \(\Psi_{u\to t}\circ\Psi_{s\to u} = \Psi_{s\to t}\).

## PF-ODE

Forward SDE \(dx_t = f_t(x_t)\,dt + g_t\,dW_t\), marginals \(p_t\).

> \(\dfrac{dx_t}{dt} = f_t(x_t) - \tfrac12 g_t^2\nabla_x\log p_t(x_t) =: v^\star(x_t, t)\) has the same marginals \(p_t\) as the SDE.

**Derivation:**

1. Fokker–Planck: \(\partial_t p_t = -\nabla\cdot(f_t p_t) + \frac12 g_t^2\Delta p_t\).
2. \(\Delta p = \nabla\cdot(\nabla p) = \nabla\cdot(p\nabla\log p)\) ⇒ \(\partial_t p_t = -\nabla\cdot\big[(f_t - \frac12 g_t^2\nabla\log p_t)\,p_t\big]\).
3. This is the continuity equation of the ODE with velocity \(v^\star\).

- Same marginals, different trajectories (SDE random, ODE deterministic).
- Check (1D, \(f = 0\), \(g = 1\), \(p_0 = \mathcal{N}(0,\sigma_0^2)\)): \(v^\star = \frac{x}{2(\sigma_0^2+t)}\) ⇒ \(x(t) = x_0\sqrt{(\sigma_0^2+t)/\sigma_0^2}\) ⇒ variance \(\sigma_0^2 + t\) ✓.

**Oracle flow map** (solution operator of the PF-ODE, with the true \(v^\star\)):

$$
\Psi_{s\to t}(x_s) = x_s + \int_s^t v^\star(x_\tau, \tau)\,d\tau
$$

- \(\Psi_{s\to s} = \mathrm{Id}\).
- Composition: \(\Psi_{u\to t}\circ\Psi_{s\to u} = \Psi_{s\to t}\).
- Invertible: \(\Psi_{t\to s} = \Psi_{s\to t}^{-1}\).
- Transport: \((\Psi_{s\to t})_\# p_s = p_t\).
- Not the OT map in general: trajectories are curved ⇒ many small steps needed.
- Multi-step sampling approximates the integral: \(x_{\tau+h} \approx x_\tau + h\,v_\theta(x_\tau, \tau)\).

## Generalized objective for flow-map-level distillation

$$
\mathcal{L}_{\text{oracle}}(\theta) = \mathbb{E}_{(s,t)\sim\pi}\ \mathbb{E}_{X_s\sim p_s}\Big[w(s,t)\ d\big(G_\theta(X_s, s, t),\ \Psi_{s\to t}(X_s)\big)\Big]
$$

- \(G_\theta(x, s, t)\): student; input point and **both** start and end times.
- \(\Psi_{s\to t}(X_s)\): target, exact teacher ODE integration ("oracle" = true \(v^\star\); in practice approximated by many teacher steps).
- \(X_s\sim p_s\): start from data noised to level \(s\).
- \(\pi\): which jumps to learn. \(w(s,t)\): weighting. \(d\): e.g. squared L2, LPIPS.

| method | \(\pi\) | target |
| --- | --- | --- |
| KD | all mass on \((s,t) = (1,0)\) | full teacher ODE |
| PD | many local pairs | student 1 step ≈ teacher 2 steps; halve steps each round |
| consistency models | \(t = 0\), any \(s\) | points on one trajectory map to the same endpoint |
| general flow maps | any \((s,t)\) | various approximations |

- \(t\to s\): \(\Psi_{s\to t}(x) \approx x + (t-s)\,v^\star(x,s)\) ⇒ student = ordinary diffusion model.
- \((s,t) = (1,0)\) ⇒ one-step generator.

## Distribution level: VSD

**Objective** (match noisy marginals at all times):

$$
\mathcal{L}_{\text{VSD}}(\theta) = \mathbb{E}_t\Big[\omega(t)\,D_{\text{KL}}\big(p^\theta_t\,\|\,p_t\big)\Big]
$$

- \(p^\theta_t\): student samples noised to \(t\). \(p_t\): data (teacher) noised to \(t\).
- Noise ⇒ full support ⇒ KL well defined (the "punchline" of [part 2](/blog/post.html?f=2026-11-14-optimal-transport.md)).

**Gradient of a general f-divergence** (\(x = G_\theta(z)\), \(r = p_\theta/p\), \(s_\theta = \nabla\log p_\theta\), \(s = \nabla\log p\)):

1. \(\partial_\theta D_f = \int p\,f'(r)\,\frac{\partial_\theta p_\theta}{p}\,dx = \int f'(r(x))\,\partial_\theta p_\theta(x)\,dx\).
2. Treat \(\varphi = f'(r)\) as fixed: \(\int\varphi\,\partial_\theta p_\theta = \partial_\theta\mathbb{E}_z[\varphi(G_\theta(z))] = \mathbb{E}_z\big[\nabla_x\varphi^\top\partial_\theta G_\theta(z)\big]\).
3. \(\nabla_x\varphi = f''(r)\nabla_x r = r f''(r)(s_\theta - s)\).

> \(\nabla_\theta D_f(p_\theta\|p) = \mathbb{E}_z\Big[w(r)\,(s_\theta - s)^\top\dfrac{\partial G_\theta(z)}{\partial\theta}\Big], \qquad w(r) = r f''(r)\)

| divergence | \(f(r)\) | \(w(r)\) |
| --- | --- | --- |
| \(\mathrm{KL}(p_\theta\|p)\) (VSD/DMD) | \(r\log r\) | \(1\) |
| \(\mathrm{KL}(p\|p_\theta)\) | \(-\log r\) | \(1/r\) |
| JS | \(r\log r - (r+1)\log(r+1) + \log 4\) | \(1/(1+r)\) |

**Why KL is special:**

- Only KL has \(w \equiv 1\) ⇒ pure score difference; both scores come from diffusion models.
- \(r f'' = c\) ⇒ \(f = c\,r\log r\) + linear ⇒ KL is the unique such f-divergence.
- Others need \(r(x)\) itself; scores give only \(\nabla\log r\) (no additive constant) ⇒ need a ratio estimator (discriminator).
- Meaning of \(r\): \(r > 1\) student over-produces there; \(r < 1\) under-covers. \(w(r)\) = how loudly each sample speaks.
- \(\mathrm{KL}(p_\theta\|p)\) (student first) is mode-seeking; f-distill calls it "reverse KL" (its convention puts the teacher first).

**SDS vs. VSD:** SDS (DreamFusion) replaces the student score with the injected noise ⇒ oversaturated, low diversity. VSD (ProlificDreamer, originally text-to-3D) learns the student score instead.

## Bilevel training

**Inner: estimate the student score** by denoising score matching on student samples.

- \(\hat x_t\mid\hat x_0 \sim \mathcal{N}(\alpha_t\hat x_0, \beta_t^2 I)\) ⇒ \(\nabla_x\log p_t(\hat x_t\mid\hat x_0) = -\dfrac{\hat x_t - \alpha_t\hat x_0}{\beta_t^2} = -\dfrac{\varepsilon}{\beta_t}\).

$$
\mathcal{L}_{\text{DSM}}(\zeta;\theta) = \mathbb{E}_{t,z,\varepsilon}\Big[\Big\|s_\zeta(\hat x_t, t) + \frac{\hat x_t - \alpha_t\hat x_0}{\beta_t^2}\Big\|^2\Big]
$$

- Conditional target ⇒ minimizer is the marginal score \(\nabla\log p^\theta_t\) (same reason as FM = CFM + C).
- \(\hat x_0\) is stop-gradient here; only \(\zeta\) updates.

**Outer: update the generator.**

$$
\nabla_\theta\mathcal{L}_{\text{VSD}}(\theta) \approx \mathbb{E}_{t,z,\varepsilon}\Big[\omega(t)\,\alpha_t\big(s_\zeta(\hat x_t,t) - s_{\text{teacher}}(\hat x_t,t)\big)^\top\nabla_\theta G_\theta(z)\Big]
$$

- \(\alpha_t\): chain rule, \(\partial\hat x_t/\partial\theta = \alpha_t\,\partial G_\theta/\partial\theta\).
- Samples move along \(s_{\text{teacher}} - s_\zeta\): toward teacher-dense, student-sparse regions.

**Loop:**

1. A few DSM steps on \(\zeta\) (fake score).
2. One generator step on \(\theta\).
3. Repeat.

- Implementation: \(g = \omega(t)(s_\zeta - s_{\text{teacher}})\); loss \(\frac12\|\hat x_0 - \mathrm{sg}(\hat x_0 - g)\|^2\) so \(\partial\mathcal{L}/\partial\hat x_0 = g\).
- Same structure as a GAN: inner net tracks a moving target; if it lags, training is unstable.

|  | GAN | VSD / DMD |
| --- | --- | --- |
| inner net | discriminator \(S_\phi\) | fake score \(s_\zeta\) |
| learns | density ratio (scalar) | student score (vector) |
| inner loss | classification / dual max | DSM |

- Link: optimal KL discriminator \(S^* = \log q - \log p_\theta\) ⇒ \(\nabla_x S^* = s_{\text{real}} - s_{\text{fake}}\). GAN learns the ratio's value then differentiates; VSD estimates its gradient directly.

## DMD family

|  | VSD | DMD | DMD2 | f-distill |
| --- | --- | --- | --- | --- |
| score-difference (KL) gradient | ✓ | ✓ | ✓ | ✓, weighted by \(w(r)\) |
| regression loss |  | ✓ |  |  |
| two time-scale update |  |  | ✓ | ✓ |
| GAN loss (discriminator) |  |  | ✓ | ✓ |
| divergence | KL | KL | KL | any f |

**DMD** (CVPR 2024): \(\mathcal{L} = \mathcal{L}_{\text{DM}} + \lambda\,\mathcal{L}_{\text{reg}}\).

- \(\mathcal{L}_{\text{reg}} = \mathbb{E}_{(z,y)}\mathrm{LPIPS}(G_\theta(z), y)\), \(y = \Psi_{1\to0}(z)\) precomputed by the teacher's deterministic ODE sampler.
- = KD on a fixed subset ⇒ fixes the coupling; counters mode collapse of the mode-seeking KL.
- Cost: millions of teacher samples; student capped by teacher.

**DMD2** (NeurIPS 2024):

- Remove regression loss.
- Instability came from an inaccurate fake score ⇒ two time-scale update rule: update \(s_\zeta\) more often than \(G_\theta\).
- GAN loss: discriminator head on the fake score network, real vs. fake **noised** samples, trained on real data ⇒ can surpass teacher.
- Multi-step: backward simulation (train on the student's own intermediate inputs).

**f-distill** (2025): DMD2 + weighting.

- Reuse the GAN discriminator to estimate \(r\): \(\hat r = (1-D)/D\) (student/teacher; paper defines \(r\) inversely).
- \(g = \mathrm{sg}\big(w(\hat r)\big)\cdot(s_\zeta - s_{\text{teacher}})\).
- JS and forward KL beat reverse-KL VSD on ImageNet-64 and MS-COCO.
- Cost: weights depend on discriminator accuracy; extreme \(D\) ⇒ extreme weights.

**Training step (f-distill; set \(w = 1\) for DMD2):**

```text
x   = G_θ(z);  t ~ p(t);  ε ~ N(0, I);  x_t = α_t·x + β_t·ε
s_real = teacher(x_t, t)        # frozen
s_fake = fake_score(x_t, t)     # trained by DSM on student samples
D      = disc(x_t, t)           # P(real); trained by BCE on real vs. student
r̂ = (1 − D)/D;  w = sg(r̂·f''(r̂))
g = w·(s_fake − s_real)
loss_G = ½‖x − sg(x − g)‖²  (+ GAN generator loss)
```
