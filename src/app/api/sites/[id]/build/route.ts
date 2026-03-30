import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buildSite } from "@/lib/build";

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await buildSite(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Build failed:", error);
    const message = error instanceof Error ? error.message : "Build failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
