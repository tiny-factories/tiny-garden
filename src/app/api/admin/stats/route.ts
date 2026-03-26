import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [totalUsers, totalSites, publishedSites, freeUsers, proUsers, recentSites] =
    await Promise.all([
      prisma.user.count(),
      prisma.site.count(),
      prisma.site.count({ where: { published: true } }),
      prisma.user.count({
        where: {
          OR: [
            { subscription: null },
            { subscription: { plan: "free" } },
          ],
        },
      }),
      prisma.user.count({
        where: { subscription: { plan: "pro" } },
      }),
      prisma.site.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { arenaUsername: true } },
        },
      }),
    ]);

  return NextResponse.json({
    totalUsers,
    totalSites,
    publishedSites,
    planBreakdown: { free: freeUsers, pro: proUsers },
    recentSites: recentSites.map((s) => ({
      id: s.id,
      subdomain: s.subdomain,
      channelTitle: s.channelTitle,
      template: s.template,
      published: s.published,
      featured: s.featured,
      arenaUsername: s.user.arenaUsername,
      createdAt: s.createdAt,
    })),
  });
}
