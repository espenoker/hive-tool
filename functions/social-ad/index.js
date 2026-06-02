// ─── Brand tokens ────────────────────────────────────────────────────────────

const COLORS = {
  darkNavy:      "#2F3D48",
  hiveRed:       "#FF371C",
  darkBlueIce:   "#CDDDE6",
  blueIce:       "#E1EAED",
  lightBlueIce:  "#F2F6F7",
  whiteIce:      "#FAFAFB",
  white:         "#FFFFFF",
};

// Font name must match what's loaded in static/fonts/
const FONT_FAMILY = '"APK Galeria", "Helvetica Neue", Helvetica, Arial, sans-serif';
const META_FONT   = '"Courier New", "Courier", monospace';

// ─── Format definitions ───────────────────────────────────────────────────────

const FORMATS = {
  "Instagram Square":    { width: 1080, height: 1080 },
  "Instagram Story":     { width: 1080, height: 1920 },
  "Instagram Landscape": { width: 1080, height: 566  },
  "LinkedIn Post":       { width: 1200, height: 628  },
  "LinkedIn Square":     { width: 1080, height: 1080 },
};

// ─── Mechanic params ──────────────────────────────────────────────────────────

export const params = {
  title: {
    type: "text",
    default: "A new era of work.\nLimitless.",
  },
  subheading: {
    type: "text",
    default: "",
  },
  meta: {
    type: "text",
    default: "[INDUSTRIAL MACHINE INTELLIGENCE]",
  },
  format: {
    type: "text",
    options: Object.keys(FORMATS),
    default: "Instagram Square",
  },
  theme: {
    type: "text",
    options: ["Dark Navy", "Light Ice"],
    default: "Dark Navy",
  },
  seed: {
    type: "number",
    default: 1,
    min: 1,
    max: 9999,
    step: 1,
  },
};

export const settings = {
  engine: require("@mechanic-design/engine-canvas"),
};

// ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────────

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawBackground(ctx, width, height, theme) {
  if (theme === "Dark Navy") {
    ctx.fillStyle = COLORS.darkNavy;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Left-to-right gradient: Light Blue Ice → Dark Blue Ice
    const grad = ctx.createLinearGradient(0, 0, width * 0.6, height);
    grad.addColorStop(0, COLORS.lightBlueIce);
    grad.addColorStop(1, COLORS.darkBlueIce);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawPixelPattern(ctx, width, height, theme, seed) {
  const rng = makeRng(seed);
  const pixelColor = theme === "Dark Navy" ? COLORS.white : COLORS.darkNavy;

  // Horizontal rectangles: ~2.3:1 ratio, matching brand pixel motif
  const rectW = Math.round(width * 0.0165); // ~18px at 1080w
  const rectH = Math.round(rectW * 0.43);   // ~8px
  const gapX  = Math.round(rectW * 0.18);
  const gapY  = Math.round(rectH * 0.55);
  const cellW = rectW + gapX;
  const cellH = rectH + gapY;

  // Pattern occupies lower-right region
  const originX = width  * 0.38;
  const originY = height * 0.35;
  const cols = Math.ceil((width  - originX) / cellW) + 1;
  const rows = Math.ceil((height - originY) / cellH) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = originX + col * cellW;
      const y = originY + row * cellH;
      if (x >= width || y >= height) continue;

      // Density: dissolves from top-left toward bottom-right (denser at corner)
      const nx = col / Math.max(1, cols - 1);
      const ny = row / Math.max(1, rows - 1);
      const density = Math.pow(nx, 0.55) * Math.pow(ny, 0.55);

      if (rng() > density * 1.15) continue;

      const alpha = Math.min(1, density * 1.4) * (0.5 + rng() * 0.5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pixelColor;
      ctx.fillRect(x, y, Math.min(rectW, width - x), Math.min(rectH, height - y));
    }
  }
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, width, height, title, theme) {
  const color    = theme === "Dark Navy" ? COLORS.white : COLORS.darkNavy;
  const pad      = Math.round(width * 0.072);
  const fontSize = Math.round(width * 0.082);
  const lineH    = Math.round(fontSize * 1.07);

  ctx.fillStyle    = color;
  ctx.font         = `${fontSize}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";

  title.split("\n").forEach((line, i) => {
    if (!line) return;
    ctx.fillText(line, pad, pad + i * lineH);
  });
}

function drawSubheading(ctx, width, height, subheading, title, theme) {
  if (!subheading) return;
  const color    = theme === "Dark Navy" ? COLORS.white : COLORS.darkNavy;
  const pad      = Math.round(width * 0.072);
  const titleSz  = Math.round(width * 0.082);
  const titleLines = title.split("\n").filter(Boolean).length;
  const afterTitle = pad + titleLines * Math.round(titleSz * 1.07);
  const subSz    = Math.round(width * 0.028);

  ctx.globalAlpha  = 0.7;
  ctx.fillStyle    = color;
  ctx.font         = `${subSz}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  ctx.fillText(subheading, pad, afterTitle + Math.round(subSz * 0.7));
  ctx.globalAlpha  = 1;
}

function drawMeta(ctx, width, height, meta, theme) {
  if (!meta) return;
  const pad    = Math.round(width * 0.072);
  const size   = Math.round(width * 0.021);
  const logoH  = Math.round(width * 0.047);
  const bottomY = height - pad - logoH * 2.6;

  ctx.fillStyle    = COLORS.hiveRed;
  ctx.font         = `${size}px ${META_FONT}`;
  ctx.textBaseline = "bottom";
  ctx.fillText(meta.toUpperCase(), pad, bottomY);
}

function drawLogoMark(ctx, x, cy, size, color) {
  // Geometric double-arrow: ⇔ drawn as stroked lines
  const totalW  = size;
  const arrowH  = size * 0.42;
  const headD   = size * 0.30; // arrowhead depth
  const lw      = Math.max(1.5, size * 0.085);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;
  ctx.lineCap     = "butt";
  ctx.lineJoin    = "miter";

  // Left arrowhead <
  ctx.beginPath();
  ctx.moveTo(x + headD,          cy - arrowH / 2);
  ctx.lineTo(x,                  cy);
  ctx.lineTo(x + headD,          cy + arrowH / 2);
  ctx.stroke();

  // Horizontal centre bar
  ctx.beginPath();
  ctx.moveTo(x + lw / 2,         cy);
  ctx.lineTo(x + totalW - lw / 2, cy);
  ctx.stroke();

  // Right arrowhead >
  ctx.beginPath();
  ctx.moveTo(x + totalW - headD, cy - arrowH / 2);
  ctx.lineTo(x + totalW,         cy);
  ctx.lineTo(x + totalW - headD, cy + arrowH / 2);
  ctx.stroke();

  ctx.restore();
}

function drawLogo(ctx, width, height, theme) {
  const color  = theme === "Dark Navy" ? COLORS.white : COLORS.darkNavy;
  const pad    = Math.round(width * 0.072);
  const logoH  = Math.round(width * 0.047);
  const markW  = Math.round(logoH * 1.15);
  const gap    = Math.round(logoH * 0.45);
  const cy     = height - pad - logoH / 2;

  drawLogoMark(ctx, pad, cy, markW, color);

  const textSz = Math.round(logoH * 0.92);
  ctx.fillStyle    = color;
  ctx.font         = `${textSz}px ${FONT_FAMILY}`;
  ctx.textBaseline = "middle";
  ctx.fillText("HIVE", pad + markW + gap, cy);
}

// ─── Main function ────────────────────────────────────────────────────────────

export default async function ({ params, mechanic }) {
  const { title, subheading, meta, format, theme, seed } = params;
  const { width, height } = FORMATS[format];

  // Load APK Galeria if the font file is present in static/fonts/
  try {
    const font = new FontFace(
      "APK Galeria",
      "url(/static/fonts/APKGaleria.woff2) format('woff2')," +
      "url(/static/fonts/APKGaleria.woff) format('woff')"
    );
    await font.load();
    document.fonts.add(font);
  } catch {
    // Font file not found — falls back to Helvetica Neue / Arial
  }

  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, width, height, theme);
  drawPixelPattern(ctx, width, height, theme, seed);
  drawTitle(ctx, width, height, title, theme);
  drawSubheading(ctx, width, height, subheading, title, theme);
  drawMeta(ctx, width, height, meta, theme);
  drawLogo(ctx, width, height, theme);

  mechanic.done(canvas);
}
