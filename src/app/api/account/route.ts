import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth)
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
    include: { subscription: true, sites: { select: { id: true } } },
  });

  const plan = user.subscription?.plan || "free";

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
  });
}
