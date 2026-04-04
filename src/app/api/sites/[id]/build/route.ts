import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildSite } from "@/lib/build";
import { getRequestAuth } from "@/lib/request-auth";
import { canRequestBuild } from "@/lib/build-limits";

// Large Are.na channels can exceed 60s (fetch + template + I/O). Match cron rebuild.
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getRequestAuth(_req);
  if (!auth)
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );

  const { id } = await params;

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { subscription: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const plan = user.subscription?.plan || "free";
  const bypassLimits = user.isAdmin || user.isFriend;

  const guard = await canRequestBuild({
    siteId: id,
    userId: auth.userId,
    plan,
    bypassLimits,
  });
  if (!guard.allowed) {
    await prisma.buildRequest.create({
      data: {
        siteId: id,
        userId: auth.userId,
        trigger: auth.method === "token" ? "cli" : "web",
        status:
          guard.code === "build_cooldown" ? "rejected_cooldown" : "rejected_quota",
        reason: guard.message.slice(0, 500),
      },
    });
    return NextResponse.json(
      { error: guard.message, code: guard.code, details: guard.details },
      { status: 429 }
    );
  }

  await prisma.buildRequest.create({
    data: {
      siteId: id,
      userId: auth.userId,
      trigger: auth.method === "token" ? "cli" : "web",
      status: "accepted",
    },
  });

  try {
    await buildSite(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Build failed:", error);
    const message = error instanceof Error ? error.message : "Build failed";
    await prisma.buildRequest.create({
      data: {
        siteId: id,
        userId: auth.userId,
        trigger: auth.method === "token" ? "cli" : "web",
        status: "failed",
        reason: message.slice(0, 500),
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
