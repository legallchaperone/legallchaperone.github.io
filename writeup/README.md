# 怎么写一篇

每篇文章只做两件事：写 `article.md`，画 `diagram.excalidraw`。剩下的（导出 SVG、对齐镜头、渲染公式、更新 Blog 列表）都自动完成。

下面所有命令都在 `writeup/` 目录里运行。

## 0. 第一次用（只做一次）

```bash
npm install
```

```bash
npx playwright install chromium
```

第二条下载一个无界面浏览器（约 100 MB），构建时用它把图导出成 SVG。

VS Code 里装扩展 **Excalidraw**（作者 pomdtr）。装好以后，`.excalidraw` 文件双击就会在画板里打开。

## 1. 新建：`npm run new <slug>`

```bash
npm run new my-topic
```

`slug` 就是网址的最后一段，只能用小写字母、数字和连字符。这条命令会生成：

```
posts/my-topic/
  article.md           ← 你写
  diagram.excalidraw   ← 你画
```

两个文件里都有能直接跑通的示例，照着改就行。新文章默认是草稿（`draft: true`），不会被发布。

发布后的地址是 `cwx.world/writeup/my-topic/`。

## 2. 写：`article.md`

开头是 front matter：

```markdown
---
title: 文章标题
date: 2026-10-29
description: 一句话简介，会显示在 Blog 列表里
draft: true
---
```

`title` 和 `date` 必填；`description` 可选；`draft: true` 表示草稿，写完删掉这一行（或改成 `false`）才会发布。

正文：

- **第一个 `##` 之前**是导语，读到这里时图显示全貌。
- **主章节**：`## 标题 {#id}`。id 只能用小写字母、数字和连字符，例如 `{#encoder}`、`{#data-flow}`。
- **子组件笔记**：`### 标题 {#父id/子id}`，写在所属主章节下面，例如 `{#encoder/attention}`。在页面上默认折叠，读者点开才展开。
- **公式**：行内 `\(E = mc^2\)`，块级 `$$ ... $$`，和 `blog/` 的写法一样。
- **图片**：把图片放在 `article.md` 旁边，用 `![说明](figure.png)` 引用，会一起发布。
- 其余都是普通 Markdown：粗体、列表、引用、代码块、链接、表格。代码块里的 `##` 不算标题。
- 想在正文里链到另一节，写 `[看这里](#encoder)`。

## 3. 画：`diagram.excalidraw`

在 VS Code 里打开 `posts/my-topic/diagram.excalidraw`，像在 excalidraw.com 上一样画。

**每个章节用一个 Frame 框住它在图上对应的区域，Frame 的名字就是章节 id：**

1. 按 `F`（或工具栏里的 Frame 工具），拖出一个框，把这一节要讲的内容框进去。
2. 双击 Frame 左上角的名字，改成章节 id，例如 `encoder`。
3. 子组件的 Frame 名写成 `父id/子id`，例如 `encoder/attention`，可以画在父 Frame 里面。

几点说明：

- 发布的页面上不显示 Frame 的边框和名字，只用来告诉镜头往哪儿看。
- 属于某个 Frame 的元素超出框的部分会被裁掉（Excalidraw 本身就是这样）。跨章节的箭头画在所有 Frame 外面就不会被裁掉。
- 没有名字的 Frame 会被忽略，可以当普通分组用。
- 某一节在图上没有 Frame 也可以：主章节读到时显示全图，子组件读到时停在父章节的 Frame 上。构建时会给一条警告提醒你。

保存（`⌘S`）后，预览页面会自动更新。

## 4. 预览：`npm run dev <slug>`

```bash
npm run dev my-topic
```

然后在浏览器打开它打印出来的地址（默认 `http://127.0.0.1:4600/writeup/my-topic/`）。草稿也能预览。

- **自动更新**：保存 `article.md` 或 `diagram.excalidraw`，页面马上更新，不用刷新。只改了文字时，滚动位置和镜头都不动。
- **出错时**：页面顶部出现红色错误条，写明哪个文件、第几行、什么问题。修好后自动消失。黄色条是警告，可以点 ✕ 关掉。
- **在页面里直接改字**：鼠标移到章节标题上，右边会出现「编辑」按钮。点开后左边是这一节的 Markdown，右边实时显示渲染结果（包括公式）。按 `⌘S` 保存，只写回这一节，文件其余部分一字不动。
  - 如果编辑期间你又在别的编辑器里改了 `article.md`，编辑框会提示冲突，保存会被拒绝，免得覆盖那边的修改。点「载入最新内容」重新开始。
- **改图**：在 VS Code 的 Excalidraw 扩展里改 `diagram.excalidraw`，保存后页面上的图会自动换掉，镜头停在当前章节。

看图时的快捷键（读者也能用）：`←` `→` 切换主章节，`+` `−` 缩放，`F` 对准当前章节，`Esc` 关目录或回到跟随。拖拽图可以平移，滚轮或双指可以缩放；回到文章继续滚动，镜头自动恢复跟随。

`Ctrl+C` 退出预览。

## 5. 构建：`npm run build`

写完后，先把 front matter 里的 `draft: true` 删掉，然后：

```bash
npm run build
```

它会：

- 构建所有非草稿文章到 `site/<slug>/`；
- 把每篇的标题、日期、简介写进 `blog/posts.json`，Blog 列表里会出现一条链到 `/writeup/<slug>/` 的条目；
- 文章改回草稿或被删掉时，自动删掉对应的 `site/<slug>/` 和 Blog 条目。

只要有任何错误，构建就停下，什么都不写。常见错误：

| 报错                                | 怎么改                                             |
| ----------------------------------- | -------------------------------------------------- |
| `## 标题缺少 {#id}`                 | 在标题末尾加 `{#id}`                               |
| `id "…" 格式不对`                   | 只用小写字母、数字、连字符；子组件写成 `父id/子id` |
| `章节 id "…" 重复`                  | 换一个 id（报错里写了第一次出现在第几行）          |
| `Frame "…" 找不到对应章节`          | 图上 Frame 名写错了，或文章里还没有这一节          |
| `Frame 名 "…" 在图里出现了不止一次` | 每个 id 只能有一个 Frame                           |
| `公式错误`                          | 按提示改 KaTeX 写法                                |

## 6. 发布：push

```bash
git add writeup/posts/my-topic writeup/site/my-topic blog/posts.json
```

```bash
git commit -m "feat: Add writeup my-topic"
```

```bash
git push
```

push 到 `main` 后，GitHub Actions 会自动部署，几分钟后就能在 `cwx.world/writeup/my-topic/` 看到。
