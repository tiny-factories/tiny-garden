import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePlantSVGLayered, seedFromSubdomain } from "@/lib/garden-icon";
import { getRequestAuth } from "@/lib/request-auth";

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
  const svg = generatePlantSVGLayered(seed);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

/** POST — Regenerate the plant icon with a new random seed */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newSeed = Math.floor(Math.random() * 2147483647);

  await prisma.site.update({
    where: { id },
    data: { iconSeed: newSeed },
  });

  const svg = generatePlantSVGLayered(newSeed);

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
