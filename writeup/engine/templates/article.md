---
title: New article title
date: {{date}}
description: One sentence on what this piece covers (shown in the Blog list).
draft: true
---

The intro goes before the first `##`. While the reader is here, the diagram shows everything.

## Part one {#part-one}

A section is `## Title {#id}`. On the diagram, draw a Frame named `part-one` around the matching area; when the reader gets here the camera moves to it.

Inline math \(E = mc^2\), display math:

$$
\mathcal{L}(\theta) = \mathbb{E}_{x}\big[\log p_\theta(x)\big]
$$

### Detail {#part-one/detail}

A component note is `### Title {#parent/child}` and starts collapsed under its section. Its Frame is named `part-one/detail` and can sit inside `part-one`.

## Part two {#part-two}

When you are done, delete `draft: true` (or set it to `false`) and run `npm run build`.
