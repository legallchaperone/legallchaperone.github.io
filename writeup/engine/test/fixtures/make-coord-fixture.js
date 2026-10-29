// Generates coord-test.excalidraw: 3 frames (one nested), content that pokes
// outside the frames, negative coordinates and a rotated shape — all things
// that move the export origin away from the frames.
import { writeFileSync } from "node:fs";
let n = 0;
const base = (o) => ({
  id: `el${++n}`,
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "hachure",
  strokeWidth: 2,
  roughness: 1,
  opacity: 100,
  angle: 0,
  seed: n * 97,
  ...o,
});
const frame = (id, name, x, y, width, height) => base({ id, type: "frame", name, x, y, width, height });
const rect = (x, y, width, height, o = {}) => base({ type: "rectangle", x, y, width, height, ...o });
const text = (x, y, s, o = {}) =>
  base({
    type: "text",
    x,
    y,
    text: s,
    originalText: s,
    fontSize: 20,
    fontFamily: 5,
    width: s.length * 11,
    height: 25,
    textAlign: "left",
    verticalAlign: "top",
    lineHeight: 1.25,
    ...o,
  });
const elements = [
  frame("f-intro", "intro", -300, -100, 400, 300),
  frame("f-model", "model", 200, -100, 620, 520),
  frame("f-enc", "model/encoder", 250, 0, 260, 220),
  text(-280, -80, "Intro 引言", { frameId: "f-intro" }),
  rect(-260, -20, 300, 160, { frameId: "f-intro", backgroundColor: "#a5d8ff", fillStyle: "solid" }),
  text(220, -80, "Model", { frameId: "f-model" }),
  rect(270, 30, 200, 150, { frameId: "f-enc", backgroundColor: "#ffc9c9" }),
  text(290, 90, "encoder 编码器", { frameId: "f-enc" }),
  base({ type: "ellipse", x: 580, y: 60, width: 180, height: 180, frameId: "f-model", backgroundColor: "#b2f2bb", fillStyle: "cross-hatch" }),
  base({
    type: "arrow",
    x: 120,
    y: 50,
    width: 140,
    height: 40,
    points: [
      [0, 0],
      [140, 40],
    ],
  }),
  text(-560, 260, "← root note outside every frame", { fontSize: 16 }),
  rect(-420, 330, 160, 90, { angle: 0.6, backgroundColor: "#ffec99", fillStyle: "solid" }),
];
writeFileSync(
  new URL("./coord-test.excalidraw", import.meta.url),
  JSON.stringify({ type: "excalidraw", version: 2, source: "fixture", elements, appState: { viewBackgroundColor: "#ffffff" }, files: {} }, null, 2)
);
