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

function generatePlant(seed: number): Grid {
  const rand = mulberry32(seed);
  const grid = emptyGrid();

  // Pick flower color
  const hueIdx = Math.floor(rand() * FLOWER_HUES.length);
  const baseHue = FLOWER_HUES[hueIdx];
  const isBrown = hueIdx === 4;
  const flowerSat = isBrown ? 30 : 60 + Math.floor(rand() * 30);
  const flowerLight = 45 + Math.floor(rand() * 15);
  const flowerDark = flowerLight - 15;
  const flowerColor = hsl(baseHue, flowerSat, flowerLight);
  const flowerHighlight = hsl(baseHue, flowerSat, flowerLight + 20);
  const flowerShadow = hsl(baseHue, flowerSat, flowerDark);

  // Green palette
  const greenHue = 130 + Math.floor(rand() * 20);
  const stemColor = hsl(greenHue, 60, 32);
  const leafColor = hsl(greenHue, 55, 40);
  const leafLight = hsl(greenHue, 50, 50);
  const leafDark = hsl(greenHue, 65, 25);

  // ── Thin stem (pushed lower in the frame) ──
  const stemX = 7 + Math.floor(rand() * 2); // center-ish
  const stemTop = 6 + Math.floor(rand() * 3); // flower at row 6-8 (lower)
  const stemBottom = 15; // goes to bottom of frame
  const stemWobble = rand() > 0.4;
  let curX = stemX;

  for (let y = stemBottom; y >= stemTop + 1; y--) {
    if (stemWobble && rand() > 0.7) curX += rand() > 0.5 ? 1 : -1;
    curX = Math.max(4, Math.min(11, curX)); // keep in bounds
    set(grid, curX, y, stemColor);
  }

  // ── 0-1 small leaves off the stem ──
  if (rand() > 0.3) {
    const ly = stemTop + 2 + Math.floor(rand() * (stemBottom - stemTop - 3));
    const side = rand() > 0.5 ? 1 : -1;
    set(grid, curX + side, ly, leafColor);
  }

  // ── Flower head ──
  const flowerType = Math.floor(rand() * 6);
  const fx = curX;
  const fy = stemTop;

  switch (flowerType) {
    case 0: { // Round bloom (3x3 with gaps)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (rand() > 0.15) {
            const c = (dx === 0 && dy === 0) ? flowerHighlight :
                      (rand() > 0.4) ? flowerColor : flowerShadow;
            set(grid, fx + dx, fy + dy, c);
          }
        }
      }
      break;
    }
    case 1: { // Tulip
      set(grid, fx, fy - 1, flowerHighlight);
      set(grid, fx, fy, flowerColor);
      set(grid, fx - 1, fy, flowerShadow);
      set(grid, fx + 1, fy, flowerShadow);
      break;
    }
    case 2: { // Daisy (cross + center)
      set(grid, fx, fy, flowerHighlight);
      set(grid, fx - 1, fy, flowerColor);
      set(grid, fx + 1, fy, flowerColor);
      set(grid, fx, fy - 1, flowerColor);
      set(grid, fx, fy + 1, flowerColor);
      break;
    }
    case 3: { // Droopy / bell
      set(grid, fx, fy - 1, flowerColor);
      set(grid, fx - 1, fy, flowerColor);
      set(grid, fx, fy, flowerHighlight);
      set(grid, fx + 1, fy, flowerColor);
      set(grid, fx - 1, fy + 1, flowerShadow);
      set(grid, fx + 1, fy + 1, flowerShadow);
      break;
    }
    case 4: { // Tiny bud
      set(grid, fx, fy, flowerHighlight);
      set(grid, fx, fy - 1, flowerColor);
      if (rand() > 0.5) set(grid, fx - 1, fy, flowerShadow);
      if (rand() > 0.5) set(grid, fx + 1, fy, flowerShadow);
      break;
    }
    case 5: { // Spiky / star
      set(grid, fx, fy, flowerHighlight);
      set(grid, fx - 1, fy - 1, flowerColor);
      set(grid, fx + 1, fy - 1, flowerColor);
      set(grid, fx - 1, fy + 1, flowerColor);
      set(grid, fx + 1, fy + 1, flowerColor);
      set(grid, fx, fy - 1, flowerShadow);
      break;
    }
  }

  return grid;
}

// ── SVG output ───────────────────────────────────────────────

/** Generate a 16×16 pixel-art plant SVG from a numeric seed */
export function generatePlantSVG(seed: number): string {
  const grid = generatePlant(seed);
  let pixels = "";

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = grid[y][x];
      if (c) {
        pixels += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">${pixels}</svg>`;
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
