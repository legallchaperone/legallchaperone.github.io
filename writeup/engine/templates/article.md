---
title: 新文章标题
date: {{date}}
description: 一句话说明这篇讲什么（会显示在 Blog 列表里）。
draft: true
---

开头的导语写在第一个 `##` 之前。读到这里时，左边显示全图。

## 第一部分 {#part-one}

主章节用 `## 标题 {#id}`。图上用一个名字叫 `part-one` 的 Frame 框住对应区域，读到这里镜头就会移过去。

行内公式 \(E = mc^2\)，块级公式：

$$
\mathcal{L}(\theta) = \mathbb{E}_{x}\big[\log p_\theta(x)\big]
$$

### 细节 {#part-one/detail}

子组件笔记用 `### 标题 {#父id/子id}`，默认折叠在主章节下面。图上对应的 Frame 名是 `part-one/detail`，可以画在 `part-one` 里面。

## 第二部分 {#part-two}

写完把 `draft: true` 删掉（或改成 `false`），再运行 `npm run build`。
