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

  const sites = await prisma.site.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { arenaUsername: true } },
    },
  });

  return NextResponse.json(
    sites.map((s) => ({
      id: s.id,
      subdomain: s.subdomain,
      channelTitle: s.channelTitle,
      channelSlug: s.channelSlug,
      template: s.template,
      published: s.published,
      featured: s.featured,
      lastBuiltAt: s.lastBuiltAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      arenaUsername: s.user.arenaUsername,
    }))
  );
}
