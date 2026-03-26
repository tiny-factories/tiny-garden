import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { subscription: true, sites: { select: { id: true } } },
  });

  return NextResponse.json({
    id: user.id,
    arenaUsername: user.arenaUsername,
    avatarUrl: user.avatarUrl,
    plan: user.subscription?.plan || "free",
    subscriptionStatus: user.subscription?.status || "active",
    siteCount: user.sites.length,
    createdAt: user.createdAt,
  });
}
