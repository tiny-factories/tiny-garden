import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buildSite } from "@/lib/build";

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isAdmin: true },
  });
  if (!admin?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const exists = await prisma.site.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await buildSite(id);
    const site = await prisma.site.findUnique({
      where: { id },
      select: { lastBuiltAt: true },
    });
    return NextResponse.json({
      success: true,
      lastBuiltAt: site?.lastBuiltAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Admin rebuild failed:", error);
    const message = error instanceof Error ? error.message : "Build failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
