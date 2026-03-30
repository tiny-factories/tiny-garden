import { ImageResponse } from "next/og";

export const runtime = "edge";

// Pixel flower definitions — each is a grid of colored pixels
const FLOWERS = [
  { // Red flower
    petals: "#e74c3c",
    stem: "#27ae60",
    pixels: [
      [0,0,1,1,0,0],
      [0,1,1,1,1,0],
      [1,1,1,1,1,1],
      [0,1,1,1,1,0],
      [0,0,2,2,0,0],
      [0,0,2,2,0,0],
      [0,3,2,2,3,0],
      [3,3,2,2,3,3],
    ],
    colors: { 1: "#e74c3c", 2: "#27ae60", 3: "#2ecc71" },
  },
  { // Yellow flower
    petals: "#f1c40f",
    stem: "#27ae60",
    pixels: [
      [0,0,1,1,0,0],
      [0,1,4,4,1,0],
      [1,4,4,4,4,1],
      [1,4,4,4,4,1],
      [0,1,4,4,1,0],
      [0,0,2,2,0,0],
      [0,3,2,2,3,0],
      [3,3,2,2,3,3],
    ],
    colors: { 1: "#f1c40f", 2: "#27ae60", 3: "#2ecc71", 4: "#f39c12" },
  },
  { // Purple flower
    petals: "#9b59b6",
    stem: "#27ae60",
    pixels: [
      [0,1,0,0,1,0],
      [1,1,1,1,1,1],
      [1,1,4,4,1,1],
      [0,1,1,1,1,0],
      [0,0,2,2,0,0],
      [0,0,2,2,0,0],
      [0,3,2,2,3,0],
      [3,3,2,2,3,3],
    ],
    colors: { 1: "#9b59b6", 2: "#27ae60", 3: "#2ecc71", 4: "#8e44ad" },
  },
  { // Blue flower
    petals: "#3498db",
    stem: "#27ae60",
    pixels: [
      [0,0,1,1,0,0],
      [0,1,1,1,1,0],
      [0,1,4,4,1,0],
      [0,0,1,1,0,0],
      [0,0,2,2,0,0],
      [0,3,2,2,0,0],
      [3,3,2,2,3,0],
      [0,3,2,2,3,3],
    ],
    colors: { 1: "#3498db", 2: "#27ae60", 3: "#2ecc71", 4: "#2980b9" },
  },
  { // Pink flower
    petals: "#e91e90",
    stem: "#27ae60",
    pixels: [
      [0,1,0,0,1,0],
      [1,1,1,1,1,1],
      [0,1,4,4,1,0],
      [0,0,1,1,0,0],
      [0,0,2,2,0,0],
      [0,0,2,2,0,0],
      [0,3,2,2,3,0],
      [3,3,2,2,3,3],
    ],
    colors: { 1: "#e91e90", 2: "#27ae60", 3: "#2ecc71", 4: "#c0392b" },
  },
];

function PixelFlower({ flower, size, x, y }: { flower: typeof FLOWERS[0]; size: number; x: number; y: number }) {
  const pixelSize = size / 8;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", flexDirection: "column" }}>
      {flower.pixels.map((row, ry) => (
        <div key={ry} style={{ display: "flex" }}>
          {row.map((cell, cx) => (
            <div
              key={cx}
              style={{
                width: pixelSize,
                height: pixelSize,
                backgroundColor: cell === 0 ? "transparent" : (flower.colors as Record<number, string>)[cell] || flower.petals,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "tiny.garden";
  const description = searchParams.get("description") || "Turn Are.na channels into websites";

  // Deterministic "random" placement based on title
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const flowerPlacements = [
    { flower: FLOWERS[seed % 5], size: 80, x: 40, y: 280 },
    { flower: FLOWERS[(seed + 1) % 5], size: 64, x: 160, y: 300 },
    { flower: FLOWERS[(seed + 2) % 5], size: 72, x: 280, y: 270 },
    { flower: FLOWERS[(seed + 3) % 5], size: 56, x: 780, y: 290 },
    { flower: FLOWERS[(seed + 4) % 5], size: 80, x: 900, y: 260 },
    { flower: FLOWERS[(seed + 2) % 5], size: 48, x: 1020, y: 310 },
    { flower: FLOWERS[(seed + 1) % 5], size: 60, x: 680, y: 300 },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fafafa",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ground */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            display: "flex",
            background: "linear-gradient(to top, #2d5016, #3a7020, #4a9030)",
          }}
        />

        {/* Pixel grid ground texture */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            display: "flex",
            backgroundColor: "#2d5016",
          }}
        />

        {/* Flowers */}
        {flowerPlacements.map((p, i) => (
          <PixelFlower key={i} flower={p.flower} size={p.size} x={p.x} y={p.y} />
        ))}

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "60px 80px",
            paddingBottom: 200,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#1a1a1a",
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#737373",
              marginTop: 16,
              textAlign: "center",
              display: "flex",
            }}
          >
            {description}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "#a3d977",
              fontWeight: 500,
              display: "flex",
            }}
          >
            tiny.garden
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
