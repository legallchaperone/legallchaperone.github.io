// Bundled by esbuild and loaded into headless Chromium by export.js.
// Exposes window.exportDiagram(scene) → { svg, offset, frames }.
import { exportToCanvas, exportToSvg, getCommonBounds, restoreElements } from "@excalidraw/excalidraw";

const PADDING = 24;

// showFrames: draw Excalidraw's own frame outlines (alignment checks only).
// Frame names stay off either way: they would enlarge the export bounds.
window.exportDiagram = async (scene, { showFrames = false } = {}) => {
  const elements = restoreElements(scene.elements || [], null).filter((el) => !el.isDeleted);
  const svgEl = await exportToSvg({
    elements,
    appState: {
      ...(scene.appState || {}),
      exportBackground: false,
      exportWithDarkMode: false,
      exportEmbedScene: false,
      frameRendering: { enabled: true, outline: showFrames, name: false, clip: true },
    },
    files: scene.files || {},
    exportPadding: PADDING,
  });

  // Same rule exportToSvg uses: bounds of root elements (not inside a frame),
  // shifted so that the top-left lands at (PADDING, PADDING).
  const roots = elements.filter((el) => !el.frameId);
  const [minX, minY] = getCommonBounds(roots);
  const offset = { x: PADDING - minX, y: PADDING - minY };

  // Excalidraw writes one <clipPath id=frameId> per frame, translated by the
  // offset it actually used — read it back to cross-check our arithmetic.
  const clip = {};
  for (const cp of svgEl.querySelectorAll("defs > clipPath")) {
    const m = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(cp.firstElementChild?.getAttribute("transform") || "");
    if (m) clip[cp.id] = { x: +m[1], y: +m[2] };
  }

  const frames = elements
    .filter((el) => el.type === "frame" || el.type === "magicframe")
    .map((f) => ({
      id: f.id,
      name: f.name ?? "",
      x: f.x + offset.x,
      y: f.y + offset.y,
      w: f.width,
      h: f.height,
      clip: clip[f.id] || null,
    }));

  const [w, h] = svgEl.getAttribute("viewBox").split(" ").slice(2).map(Number);
  return { svg: svgEl.outerHTML, width: w, height: h, offset, frames };
};
// Fill in every field Excalidraw expects, with text sized by the real fonts.
// Used by scripts that generate .excalidraw files (templates, fixtures).
window.normalizeScene = async (scene) => {
  const rough = restoreElements(scene.elements, null);
  await exportToCanvas({ elements: rough, files: {} }); // loads the fonts
  const elements = restoreElements(scene.elements, null, { refreshDimensions: true, repairBindings: true });
  return {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements,
    appState: { gridSize: 20, viewBackgroundColor: "#ffffff" },
    files: scene.files || {},
  };
};
window.__exportReady = true;
