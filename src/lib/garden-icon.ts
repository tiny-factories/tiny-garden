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

  // ── Ground leaves (rows 12-15) ──
  const groundWidth = 3 + Math.floor(rand() * 4); // 3-6
  const groundCenterX = 7 + Math.floor(rand() * 2); // 7 or 8
  for (let i = 0; i < groundWidth; i++) {
    const gx = groundCenterX - Math.floor(groundWidth / 2) + i;
    set(grid, gx, 14, leafColor);
    set(grid, gx, 15, leafDark);
    if (rand() > 0.3) set(grid, gx, 13, leafLight);
  }
  // Extra scattered ground pixels
  for (let i = 0; i < 4; i++) {
    const gx = groundCenterX - 3 + Math.floor(rand() * 7);
    const gy = 13 + Math.floor(rand() * 3);
    if (rand() > 0.4) set(grid, gx, gy, rand() > 0.5 ? leafColor : leafDark);
  }

  // ── Stem (column ~7-8, rows from ground up to flower) ──
  const stemX = groundCenterX;
  const stemTop = 3 + Math.floor(rand() * 3); // flower starts at row 3-5
  const stemWobble = rand() > 0.5;

  for (let y = 12; y >= stemTop; y--) {
    const wx = stemWobble && y % 3 === 0 ? stemX + (rand() > 0.5 ? 1 : -1) : stemX;
    set(grid, wx, y, stemColor);
    // Occasional thicker stem
    if (rand() > 0.7) set(grid, wx + 1, y, stemColor);
  }

  // ── Side leaves on stem ──
  const numLeaves = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < numLeaves; i++) {
    const ly = 8 + Math.floor(rand() * 4); // rows 8-11
    const side = rand() > 0.5 ? 1 : -1;
    const leafLen = 1 + Math.floor(rand() * 2);
    for (let j = 1; j <= leafLen; j++) {
      set(grid, stemX + side * j, ly, leafColor);
      if (rand() > 0.5) set(grid, stemX + side * j, ly - 1, leafLight);
    }
  }

  // ── Flower head ──
  const flowerType = Math.floor(rand() * 5);
  const fx = stemX;
  const fy = stemTop;

  switch (flowerType) {
    case 0: // Round bloom (3x3)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const c = (dx === 0 && dy === 0) ? flowerHighlight :
                    (rand() > 0.3) ? flowerColor : flowerShadow;
          set(grid, fx + dx, fy + dy, c);
        }
      }
      // Extra petals
      if (rand() > 0.4) set(grid, fx, fy - 2, flowerColor);
      if (rand() > 0.4) set(grid, fx - 2, fy, flowerColor);
      if (rand() > 0.4) set(grid, fx + 2, fy, flowerColor);
      break;

    case 1: // Tall spike / tulip
      set(grid, fx, fy - 2, flowerHighlight);
      set(grid, fx, fy - 1, flowerColor);
      set(grid, fx, fy, flowerColor);
      set(grid, fx - 1, fy, flowerShadow);
      set(grid, fx + 1, fy, flowerShadow);
      set(grid, fx - 1, fy + 1, flowerShadow);
      set(grid, fx + 1, fy + 1, flowerShadow);
      break;

    case 2: // Star / cross shape
      set(grid, fx, fy, flowerHighlight);
      set(grid, fx - 1, fy, flowerColor);
      set(grid, fx + 1, fy, flowerColor);
      set(grid, fx, fy - 1, flowerColor);
      set(grid, fx, fy + 1, flowerColor);
      set(grid, fx - 1, fy - 1, flowerShadow);
      set(grid, fx + 1, fy - 1, flowerShadow);
      set(grid, fx - 1, fy + 1, flowerShadow);
      set(grid, fx + 1, fy + 1, flowerShadow);
      break;

    case 3: // Wide / bushy (4x2)
      for (let dx = -2; dx <= 1; dx++) {
        set(grid, fx + dx, fy, rand() > 0.3 ? flowerColor : flowerHighlight);
        set(grid, fx + dx, fy - 1, rand() > 0.3 ? flowerColor : flowerShadow);
      }
      if (rand() > 0.3) set(grid, fx - 1, fy - 2, flowerColor);
      if (rand() > 0.3) set(grid, fx, fy - 2, flowerHighlight);
      break;

    case 4: // Small bud
      set(grid, fx, fy, flowerHighlight);
      set(grid, fx, fy - 1, flowerColor);
      set(grid, fx - 1, fy, flowerShadow);
      set(grid, fx + 1, fy, flowerShadow);
      // Little leaf bracts
      set(grid, fx - 1, fy + 1, leafLight);
      set(grid, fx + 1, fy + 1, leafLight);
      break;
  }

  // ── Random scatter (adds organic feel) ──
  for (let i = 0; i < 3; i++) {
    const sx = groundCenterX - 3 + Math.floor(rand() * 7);
    const sy = 10 + Math.floor(rand() * 5);
    if (!grid[sy]?.[sx] && rand() > 0.6) {
      set(grid, sx, sy, rand() > 0.5 ? leafColor : leafDark);
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
