// The static page shell. Everything the viewer needs is in the HTML: the
// rendered article, the inline SVG and a JSON block with frame boxes.

import { articleHtml, tocHtml, sectionsData } from "./article.js";
import { escapeHtml } from "./render.js";

export const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
const FONTS = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400&display=swap";

export const jsonForScript = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

export function viewerData(article, diagram, frameMap) {
  return {
    sections: sectionsData(article),
    frames: frameMap,
    width: diagram ? diagram.width : 0,
    height: diagram ? diagram.height : 0,
  };
}

/**
 * @param article from renderArticle
 * @param diagram {svg, width, height} or null
 * @param frameMap from checkFrames
 * @param devScript optional extra module script (dev server only)
 */
export function renderPage({ article, diagram, frameMap, devScript = "" }) {
  const { meta } = article;
  const data = viewerData(article, diagram, frameMap);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(meta.title)} — Wenxin Chen</title>
  ${meta.description ? `<meta name="description" content="${escapeHtml(meta.description)}" />` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${FONTS}" rel="stylesheet" />
  <link rel="stylesheet" href="${KATEX_CSS}" />
  <link rel="icon" href="/favicon.ico" type="image/x-icon" />
  <link rel="stylesheet" href="viewer.css" />
</head>
<body class="wu">
  <header class="wu-top">
    <nav class="wu-crumbs">
      <a href="/" class="wu-back">← Wenxin Chen</a>
      <span class="wu-sep">/</span>
      <a href="/blog/" class="wu-back">Blog</a>
    </nav>
    <div class="wu-toc">
      <button type="button" class="wu-toc-btn" aria-expanded="false" aria-controls="wu-toc-menu">目录 <span aria-hidden="true">▾</span></button>
      <nav class="wu-toc-menu" id="wu-toc-menu" hidden>${tocHtml(article)}</nav>
    </div>
  </header>

  <div class="wu-layout">
    <div class="wu-figure">
      <div class="wu-stage" tabindex="-1" aria-label="Diagram">
        <div class="wu-world">
          <div class="wu-lift" hidden></div>
          <div class="wu-drawing">${diagram ? diagram.svg : ""}</div>
          <svg class="wu-dim" aria-hidden="true"><path fill-rule="evenodd" /></svg>
          <svg class="wu-hot"></svg>
        </div>
      </div>
      <button type="button" class="wu-fab">看全图</button>
    </div>
    <div class="wu-split" role="separator" aria-orientation="vertical" aria-label="调整左右宽度" tabindex="0"></div>
    <main class="wu-text">
      <article class="wu-article">
${articleHtml(article)}
      </article>
    </main>
  </div>

  <script type="application/json" id="wu-data">${jsonForScript(data)}</script>
  <script type="module" src="viewer.js"></script>${devScript}
</body>
</html>
`;
}
