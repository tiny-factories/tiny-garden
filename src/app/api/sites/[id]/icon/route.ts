import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generatePlantSVG, seedFromSubdomain } from "@/lib/garden-icon";

/** GET — Serve the plant icon SVG for a site */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const seed = site.iconSeed ?? seedFromSubdomain(site.subdomain);
  const svg = generatePlantSVG(seed);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

/** POST — Regenerate the plant icon with a new random seed */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newSeed = Math.floor(Math.random() * 2147483647);

  await prisma.site.update({
    where: { id },
    data: { iconSeed: newSeed },
  });

  const svg = generatePlantSVG(newSeed);

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
