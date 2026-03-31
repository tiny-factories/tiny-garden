/**
 * Procedural pixel-art plant/flower generator.
 * Takes a numeric seed → returns a 16×16 SVG string.
 *
 * The plants have green stems & leaves at the bottom,
 * colorful flower heads at the top — tiny garden vibes.
 */

// ── Seeded PRNG (mulberry32) ─────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string into a 32-bit integer seed */
export function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Color palette ────────────────────────────────────────────

const FLOWER_HUES = [
  0,    // red
  20,   // orange
  45,   // yellow
  75,   // lime
  30,   // brown-ish (low sat)
  270,  // purple
  210,  // blue
  180,  // teal/cyan
  330,  // pink
  290,  // magenta
  60,   // chartreuse
  150,  // mint
];

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h},${s}%,${l}%)`;
}

// ── Grid helpers ─────────────────────────────────────────────

const SIZE = 16;
type Grid = (string | null)[][];

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function set(grid: Grid, x: number, y: number, color: string) {
  if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
    grid[y][x] = color;
  }
}

// ── Plant generation ─────────────────────────────────────────

type PlantLayerModel = {
  stem: Grid;
  foliage: Grid;
  bloom: Grid;
  /** Bottom of stem (for scaleY from “soil”). */
  stemOrigin: { x: number; y: number };
  /** Flower attach point (bloom scale origin). */
  bloomOrigin: { x: number; y: number };
  /** Leaf pixel center, if any. */
  foliageLeaf: { x: number; y: number } | null;
  /** Horizontal bud direction in grid units (−1 or 1). */
  foliageSide: number | null;
};

function gridToRects(grid: Grid): string {
  let pixels = "";
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = grid[y][x];
      if (c) {
        pixels += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
      }
    }
  }
  return pixels;
}

function mergeLayers(stem: Grid, foliage: Grid, bloom: Grid): Grid {
  const out = emptyGrid();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      out[y][x] = stem[y][x] ?? foliage[y][x] ?? bloom[y][x] ?? null;
    }
  }
  return out;
}

function generatePlantLayers(seed: number): PlantLayerModel {
  const rand = mulberry32(seed);
  const stem: Grid = emptyGrid();
  const foliage: Grid = emptyGrid();
  const bloom: Grid = emptyGrid();

  const hueIdx = Math.floor(rand() * FLOWER_HUES.length);
  const baseHue = FLOWER_HUES[hueIdx];
  const isBrown = hueIdx === 4;
  const flowerSat = isBrown ? 30 : 60 + Math.floor(rand() * 30);
  const flowerLight = 45 + Math.floor(rand() * 15);
  const flowerDark = flowerLight - 15;
  const flowerColor = hsl(baseHue, flowerSat, flowerLight);
  const flowerHighlight = hsl(baseHue, flowerSat, flowerLight + 20);
  const flowerShadow = hsl(baseHue, flowerSat, flowerDark);

  const greenHue = 130 + Math.floor(rand() * 20);
  const stemColor = hsl(greenHue, 60, 32);
  const leafColor = hsl(greenHue, 55, 40);

  const stemX = 7 + Math.floor(rand() * 2);
  const stemTop = 6 + Math.floor(rand() * 3);
  const stemBottom = 15;
  const stemWobble = rand() > 0.4;
  let curX = stemX;

  for (let y = stemBottom; y >= stemTop + 1; y--) {
    if (stemWobble && rand() > 0.7) curX += rand() > 0.5 ? 1 : -1;
    curX = Math.max(4, Math.min(11, curX));
    set(stem, curX, y, stemColor);
  }

  let foliageLeaf: { x: number; y: number } | null = null;
  let foliageSide: number | null = null;
  if (rand() > 0.3) {
    const ly = stemTop + 2 + Math.floor(rand() * (stemBottom - stemTop - 3));
    const side = rand() > 0.5 ? 1 : -1;
    foliageSide = side;
    set(foliage, curX + side, ly, leafColor);
    foliageLeaf = { x: curX + side, y: ly };
  }

  const flowerType = Math.floor(rand() * 6);
  const fx = curX;
  const fy = stemTop;

  switch (flowerType) {
    case 0: {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (rand() > 0.15) {
            const c =
              dx === 0 && dy === 0
                ? flowerHighlight
                : rand() > 0.4
                  ? flowerColor
                  : flowerShadow;
            set(bloom, fx + dx, fy + dy, c);
          }
        }
      }
      break;
    }
    case 1: {
      set(bloom, fx, fy - 1, flowerHighlight);
      set(bloom, fx, fy, flowerColor);
      set(bloom, fx - 1, fy, flowerShadow);
      set(bloom, fx + 1, fy, flowerShadow);
      break;
    }
    case 2: {
      set(bloom, fx, fy, flowerHighlight);
      set(bloom, fx - 1, fy, flowerColor);
      set(bloom, fx + 1, fy, flowerColor);
      set(bloom, fx, fy - 1, flowerColor);
      set(bloom, fx, fy + 1, flowerColor);
      break;
    }
    case 3: {
      set(bloom, fx, fy - 1, flowerColor);
      set(bloom, fx - 1, fy, flowerColor);
      set(bloom, fx, fy, flowerHighlight);
      set(bloom, fx + 1, fy, flowerColor);
      set(bloom, fx - 1, fy + 1, flowerShadow);
      set(bloom, fx + 1, fy + 1, flowerShadow);
      break;
    }
    case 4: {
      set(bloom, fx, fy, flowerHighlight);
      set(bloom, fx, fy - 1, flowerColor);
      if (rand() > 0.5) set(bloom, fx - 1, fy, flowerShadow);
      if (rand() > 0.5) set(bloom, fx + 1, fy, flowerShadow);
      break;
    }
    case 5: {
      set(bloom, fx, fy, flowerHighlight);
      set(bloom, fx - 1, fy - 1, flowerColor);
      set(bloom, fx + 1, fy - 1, flowerColor);
      set(bloom, fx - 1, fy + 1, flowerColor);
      set(bloom, fx + 1, fy + 1, flowerColor);
      set(bloom, fx, fy - 1, flowerShadow);
      break;
    }
  }

  return {
    stem,
    foliage,
    bloom,
    stemOrigin: { x: curX + 0.5, y: stemBottom + 0.5 },
    bloomOrigin: { x: fx + 0.5, y: fy + 0.5 },
    foliageLeaf,
    foliageSide,
  };
}

// ── SVG output ───────────────────────────────────────────────

/**
 * Flat 16×16 plant (favicon, static embeds). Same pixels as layered output.
 */
export function generatePlantSVG(seed: number): string {
  const layers = generatePlantLayers(seed);
  const grid = mergeLayers(layers.stem, layers.foliage, layers.bloom);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">${gridToRects(grid)}</svg>`;
}

/**
 * Layered plant for in-app animations (stem → leaf bud → bloom).
 * Inert without `.plant-icon--growing` / `.plant-icon--sprout` CSS.
 */
export function generatePlantSVGLayered(seed: number): string {
  const L = generatePlantLayers(seed);
  const stemR = gridToRects(L.stem);
  const foliageR = gridToRects(L.foliage);
  const bloomR = gridToRects(L.bloom);
  const so = L.stemOrigin;
  const bo = L.bloomOrigin;

  let foliageStyle = "";
  if (L.foliageLeaf != null && L.foliageSide != null) {
    const fo = L.foliageLeaf;
    const attachX = fo.x - L.foliageSide + 0.5;
    const attachY = fo.y + 0.5;
    const bud = -L.foliageSide * 0.6;
    foliageStyle = `transform-origin:${attachX}px ${attachY}px;--foliage-bud:${bud}px`;
  }
  const foliageGroup = foliageStyle
    ? `<g class="plant-foliage" style="${foliageStyle}">${foliageR}</g>`
    : `<g class="plant-foliage">${foliageR}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges"><g class="plant-stem" style="transform-origin:${so.x}px ${so.y}px">${stemR}</g>${foliageGroup}<g class="plant-bloom" style="transform-origin:${bo.x}px ${bo.y}px">${bloomR}</g></svg>`;
}

/** Generate as a data URI for use in <link rel="icon"> or <img> */
export function generatePlantDataURI(seed: number): string {
  const svg = generatePlantSVG(seed);
  // Use encodeURIComponent for safe data URI
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Default seed from a subdomain string */
export function seedFromSubdomain(subdomain: string): number {
  return Math.abs(hashSeed(subdomain));
}

// ── Pollinator (pixel bee, matches plant SVG style) ───────────

const BEE_W = 7;
const BEE_H = 6;
const beeY = "hsl(48,92%,55%)";
const beeBlack = "hsl(25,8%,14%)";
const beeHead = "hsl(40,78%,48%)";
const beeWing = "hsl(220,22%,86%)";

/** Minimal 7×6 pixel bee — same rect + crispEdges look as {@link generatePlantSVG}. */
export function pixelPollinatorSVG(): string {
  const pixels: [number, number, string][] = [
    [2, 0, beeHead],
    [3, 0, beeHead],
    [1, 1, beeHead],
    [2, 1, beeHead],
    [3, 1, beeHead],
    [4, 1, beeHead],
    [0, 2, beeWing],
    [1, 2, beeWing],
    [2, 2, beeY],
    [3, 2, beeY],
    [4, 2, beeY],
    [5, 2, beeBlack],
    [1, 3, beeBlack],
    [2, 3, beeY],
    [3, 3, beeBlack],
    [4, 3, beeY],
    [5, 3, beeBlack],
    [2, 4, beeY],
    [3, 4, beeBlack],
    [4, 4, beeY],
    [3, 5, beeBlack],
  ];
  const rects = pixels
    .map(([x, y, c]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BEE_W} ${BEE_H}" shape-rendering="crispEdges">${rects}</svg>`;
}

/** Inline-ready SVG string (pixels are fixed). */
export const PIXEL_POLLINATOR_SVG = pixelPollinatorSVG();
