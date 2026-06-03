import {
  FORMATS, COLORS,
  makeRng, loadFont, setupCanvas, computeCells,
  sampleImageDensity, buildCellData,
  drawBackground, drawPattern,
  drawTitle, drawSubheading, drawMeta, drawLogo,
} from "../_utils.js";

// ─── Params ───────────────────────────────────────────────────────────────────

export const params = {
  title:       { type: "text",    default: "A new era of work.\nLimitless." },
  subheading:  { type: "text",    default: "" },
  meta:        { type: "text",    default: "[INDUSTRIAL MACHINE INTELLIGENCE]" },

  format:      { type: "text",    options: Object.keys(FORMATS), default: "Instagram Square" },
  theme:       { type: "text",    options: ["Dark Navy", "Light Ice"],          default: "Dark Navy" },

  patternMode: { type: "text",    options: ["Geometric", "Image"],              default: "Geometric" },
  shapeType:   { type: "text",    options: ["Wave", "Arc", "Circle", "Diagonal", "Cloud"], default: "Wave" },
  sourceImage: { type: "image" },

  rectSize:    { type: "number",  default: 18,  min: 4,   max: 60,  step: 1    },
  rectAspect:  { type: "number",  default: 2.3, min: 1.0, max: 5.0, step: 0.1  },
  density:     { type: "number",  default: 0.7, min: 0.1, max: 1.0, step: 0.05 },

  seed:        { type: "number",  default: 1,   min: 1,   max: 9999, step: 1   },
};

export const settings = {
  engine: require("@mechanic-design/engine-canvas"),
};

// ─── Draw ─────────────────────────────────────────────────────────────────────

export default async function ({ params, mechanic }) {
  const {
    title, subheading, meta, format, theme,
    patternMode, shapeType, sourceImage,
    rectSize, rectAspect, density, seed,
  } = params;

  const { width, height } = FORMATS[format];

  await loadFont();

  const { canvas, ctx }                       = setupCanvas(width, height);
  const { rectW, rectH, cellW, cellH, cols, rows } = computeCells(width, height, rectSize, rectAspect);

  const pixelColor = theme === "Dark Navy" ? COLORS.white : COLORS.darkNavy;
  const rng        = makeRng(seed);

  const imageGrid = (patternMode === "Image" && sourceImage)
    ? sampleImageDensity(sourceImage, width, height, cols, rows, cellW, cellH)
    : null;

  const cells = buildCellData(cols, rows, patternMode, shapeType, density, imageGrid, rng);

  drawBackground(ctx, width, height, theme);
  drawPattern(ctx, width, height, cells, cols, rows, cellW, cellH, rectW, rectH, pixelColor, 0);
  drawTitle(ctx, width, height, title, theme);
  drawSubheading(ctx, width, height, subheading, title, theme);
  drawMeta(ctx, width, height, meta, theme);
  await drawLogo(ctx, width, height, theme);

  mechanic.done(canvas);
}
