// ─── Brand tokens ─────────────────────────────────────────────────────────────

export const COLORS = {
  darkNavy:     "#2F3D48",
  hiveRed:      "#FF371C",
  darkBlueIce:  "#CDDDE6",
  blueIce:      "#E1EAED",
  lightBlueIce: "#F2F6F7",
  whiteIce:     "#FAFAFB",
  white:        "#FFFFFF",
};

export const FONT_FAMILY = '"APK Galeria", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const META_FONT   = '"Courier New", "Courier", monospace';

export const FORMATS = {
  "Instagram Square":    { width: 1080, height: 1080 },
  "Instagram Story":     { width: 1080, height: 1920 },
  "Instagram Landscape": { width: 1080, height: 566  },
  "LinkedIn Post":       { width: 1200, height: 628  },
  "LinkedIn Square":     { width: 1080, height: 1080 },
};

// ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────────

export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Geometric density maps (0–1 per cell) ────────────────────────────────────

function waveDensity(col, row, cols, rows) {
  const x = col / Math.max(1, cols - 1);
  const y = row / Math.max(1, rows - 1);
  // Sine wave center line that shifts vertically across x
  const centerY = 0.52 + 0.22 * Math.sin(x * Math.PI * 2.8);
  const thickness = 0.24;
  const dist = Math.abs(y - centerY);
  if (dist > thickness) return 0;
  return Math.pow(1 - dist / thickness, 0.6);
}

function arcDensity(col, row, cols, rows) {
  // Concentric arc anchored at bottom-right
  const dist = Math.sqrt((col - cols) ** 2 + (row - rows) ** 2);
  const outerR = cols * 0.88;
  const innerR = cols * 0.42;
  if (dist < innerR || dist > outerR) return 0;
  const t = (dist - innerR) / (outerR - innerR);
  return Math.sin(t * Math.PI);
}

function circleDensity(col, row, cols, rows) {
  const cx = cols * 0.62;
  const cy = rows * 0.54;
  const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2);
  const radius = Math.min(cols, rows) * 0.44;
  if (dist > radius) return 0;
  return Math.pow(1 - dist / radius, 0.35);
}

function diagonalDensity(col, row, cols, rows) {
  const x = col / Math.max(1, cols - 1);
  const y = row / Math.max(1, rows - 1);
  // Band along the anti-diagonal (top-right → bottom-left)
  const dist = Math.abs(x + y - 1.1);
  const thickness = 0.28;
  if (dist > thickness) return 0;
  return Math.pow(1 - dist / thickness, 0.55);
}

function cloudDensity(col, row, cols, rows) {
  // Dissolve from bottom-right corner inward
  const nx = col / Math.max(1, cols - 1);
  const ny = row / Math.max(1, rows - 1);
  return Math.pow(nx, 0.55) * Math.pow(ny, 0.55);
}

export function getGeometricDensity(col, row, cols, rows, shapeType) {
  switch (shapeType) {
    case "Wave":     return waveDensity(col, row, cols, rows);
    case "Arc":      return arcDensity(col, row, cols, rows);
    case "Circle":   return circleDensity(col, row, cols, rows);
    case "Diagonal": return diagonalDensity(col, row, cols, rows);
    case "Cloud":
    default:         return cloudDensity(col, row, cols, rows);
  }
}

// ─── Image → density grid ─────────────────────────────────────────────────────

export function sampleImageDensity(image, width, height, cols, rows, cellW, cellH) {
  const tmp = document.createElement("canvas");
  tmp.width  = width;
  tmp.height = height;
  const tCtx = tmp.getContext("2d");
  tCtx.drawImage(image, 0, 0, width, height);
  const data = tCtx.getImageData(0, 0, width, height).data;

  const grid = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx  = Math.min(width  - 1, col * cellW + Math.round(cellW / 2));
      const sy  = Math.min(height - 1, row * cellH + Math.round(cellH / 2));
      const idx = (sy * width + sx) * 4;
      // Brightness 0–1; invert so dark image areas → dense pixels
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 255;
      grid[row * cols + col] = 1 - brightness;
    }
  }
  return grid;
}

// ─── Cell data: pre-bake density + random values (animation-stable) ──────────

export function buildCellData(cols, rows, patternMode, shapeType, density, imageGrid, rng) {
  // Layout per cell: [baseDensity, skipRand, alphaRand]
  const cells = new Float32Array(cols * rows * 3);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let base = patternMode === "Image" && imageGrid
        ? imageGrid[row * cols + col]
        : getGeometricDensity(col, row, cols, rows, shapeType);
      base *= density;
      const i = (row * cols + col) * 3;
      cells[i]     = base;
      cells[i + 1] = rng();
      cells[i + 2] = rng();
    }
  }
  return cells;
}

// ─── Pattern renderer ─────────────────────────────────────────────────────────
// time: 0 = static; 0–1 = animated progress (loops)

export function drawPattern(ctx, width, height, cells, cols, rows, cellW, cellH, rectW, rectH, pixelColor, time) {
  // Traveling wave constants (left-to-right: phase = kx - ωt)
  const k     = (5 * Math.PI * 2) / cols; // ~5 wavelengths across canvas
  const omega = Math.PI * 2;              // 1 full cycle per animation loop

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellW;
      const y = row * cellH;
      if (x >= width || y >= height) continue;

      const i    = (row * cols + col) * 3;
      let   base = cells[i];
      const r1   = cells[i + 1];
      const r2   = cells[i + 2];

      if (time > 0) {
        // Primary wave sweeping left → right
        const wave1 = 0.5 + 0.5 * Math.sin(k * col - omega * time);
        // Slower secondary wave for complexity
        const wave2 = 0.6 + 0.4 * Math.sin(k * 0.6 * col - omega * 0.7 * time + 1.2);
        base = base * (wave1 * 0.7 + wave2 * 0.3);
      }

      if (r1 > base * 1.12) continue;

      const alpha = Math.min(1, base * 1.5) * (0.45 + r2 * 0.55);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle   = pixelColor;
      ctx.fillRect(x, y, Math.min(rectW, width - x), Math.min(rectH, height - y));
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Background ───────────────────────────────────────────────────────────────

export function drawBackground(ctx, width, height, theme) {
  if (theme === "Dark Navy") {
    ctx.fillStyle = COLORS.darkNavy;
    ctx.fillRect(0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width * 0.6, height);
    grad.addColorStop(0, COLORS.lightBlueIce);
    grad.addColorStop(1, COLORS.darkBlueIce);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

// ─── Typography ───────────────────────────────────────────────────────────────

export function drawTitle(ctx, width, height, title, theme) {
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

export function drawSubheading(ctx, width, height, subheading, title, theme) {
  if (!subheading) return;
  const color      = theme === "Dark Navy" ? COLORS.white : COLORS.darkNavy;
  const pad        = Math.round(width * 0.072);
  const titleSz    = Math.round(width * 0.082);
  const titleLines = title.split("\n").filter(Boolean).length;
  const afterTitle = pad + titleLines * Math.round(titleSz * 1.07);
  const subSz      = Math.round(width * 0.028);

  ctx.globalAlpha  = 0.7;
  ctx.fillStyle    = color;
  ctx.font         = `${subSz}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  ctx.fillText(subheading, pad, afterTitle + Math.round(subSz * 0.7));
  ctx.globalAlpha  = 1;
}

export function drawMeta(ctx, width, height, meta, theme) {
  if (!meta) return;
  const pad     = Math.round(width * 0.072);
  const size    = Math.round(width * 0.021);
  const logoH   = Math.round(width * 0.047);
  const bottomY = height - pad - logoH * 2.6;

  ctx.fillStyle    = COLORS.hiveRed;
  ctx.font         = `${size}px ${META_FONT}`;
  ctx.textBaseline = "bottom";
  ctx.fillText(meta.toUpperCase(), pad, bottomY);
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function drawLogoMark(ctx, x, cy, size, color) {
  const arrowH = size * 0.42;
  const headD  = size * 0.30;
  const lw     = Math.max(1.5, size * 0.085);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;
  ctx.lineCap     = "butt";
  ctx.lineJoin    = "miter";

  ctx.beginPath();
  ctx.moveTo(x + headD,         cy - arrowH / 2);
  ctx.lineTo(x,                 cy);
  ctx.lineTo(x + headD,         cy + arrowH / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + lw / 2,        cy);
  ctx.lineTo(x + size - lw / 2, cy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size - headD,  cy - arrowH / 2);
  ctx.lineTo(x + size,          cy);
  ctx.lineTo(x + size - headD,  cy + arrowH / 2);
  ctx.stroke();

  ctx.restore();
}

export function drawLogo(ctx, width, height, theme) {
  const color  = theme === "Dark Navy" ? COLORS.white : COLORS.darkNavy;
  const pad    = Math.round(width * 0.072);
  const logoH  = Math.round(width * 0.047);
  const markW  = Math.round(logoH * 1.15);
  const gap    = Math.round(logoH * 0.45);
  const cy     = height - pad - logoH / 2;

  drawLogoMark(ctx, pad, cy, markW, color);

  ctx.fillStyle    = color;
  ctx.font         = `${Math.round(logoH * 0.92)}px ${FONT_FAMILY}`;
  ctx.textBaseline = "middle";
  ctx.fillText("HIVE", pad + markW + gap, cy);
}

// ─── Font loader ──────────────────────────────────────────────────────────────

export async function loadFont() {
  try {
    const font = new FontFace(
      "APK Galeria",
      "url(/static/fonts/APKGaleria-Regular.woff2) format('woff2')," +
      "url(/static/fonts/APKGaleria-Regular.woff) format('woff')"
    );
    await font.load();
    document.fonts.add(font);
  } catch {
    // Falls back to Helvetica Neue / Arial
  }
}

// ─── Canvas + cell setup ──────────────────────────────────────────────────────

export function setupCanvas(width, height) {
  const canvas  = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") };
}

export function computeCells(width, height, rectSize, rectAspect) {
  const rectW = Math.round(rectSize);
  const rectH = Math.max(2, Math.round(rectSize / rectAspect));
  const cellW = rectW + Math.round(rectW * 0.18);
  const cellH = rectH + Math.round(rectH * 0.5);
  const cols  = Math.ceil(width  / cellW) + 1;
  const rows  = Math.ceil(height / cellH) + 1;
  return { rectW, rectH, cellW, cellH, cols, rows };
}
