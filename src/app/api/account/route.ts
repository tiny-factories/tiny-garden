import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isBetaFull } from "@/lib/beta";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { subscription: true, sites: { select: { id: true } } },
  });

  const plan = user.subscription?.plan || "free";
  const betaFull = await isBetaFull();
  const betaGated =
    betaFull && !user.isAdmin && !user.isFriend && plan === "free";

  return NextResponse.json({
    id: user.id,
    arenaUsername: user.arenaUsername,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    isFriend: user.isFriend,
    plan,
    subscriptionStatus: user.subscription?.status || "active",
    siteCount: user.sites.length,
    createdAt: user.createdAt,
    betaFull,
    betaGated,
  });
}
