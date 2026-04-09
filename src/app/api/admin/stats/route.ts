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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalUsers, totalSites, publishedSites, freeUsers, proUsers, recentSites, recentUsers, recentSiteCreations] =
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
      // Users created in last 30 days for signup chart
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Sites created in last 30 days for growth chart
      prisma.site.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  // Group by day
  function groupByDay(items: { createdAt: Date }[]): { date: string; count: number }[] {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const date = item.createdAt.toISOString().slice(0, 10);
      counts[date] = (counts[date] || 0) + 1;
    }
    const timeline: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      timeline.push({ date: key, count: counts[key] || 0 });
    }
    return timeline;
  }

  return NextResponse.json({
    totalUsers,
    totalSites,
    publishedSites,
    planBreakdown: { free: freeUsers, pro: proUsers },
    userSignups: groupByDay(recentUsers),
    siteCreations: groupByDay(recentSiteCreations),
    recentSites: recentSites.map((s) => ({
      id: s.id,
      subdomain: s.subdomain,
      channelSlug: s.channelSlug,
      channelTitle: s.channelTitle,
      template: s.template,
      published: s.published,
      featured: s.featured,
      arenaUsername: s.user.arenaUsername,
      createdAt: s.createdAt,
    })),
  });
}
