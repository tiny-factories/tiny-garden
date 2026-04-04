import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!adminUser?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sites = await prisma.site.findMany({
    where: { featured: true, published: true },
    include: {
      user: { select: { arenaUsername: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    sites.map((s) => ({
      id: s.id,
      subdomain: s.subdomain,
      channelTitle: s.channelTitle,
      template: s.template,
      published: s.published,
      featured: s.featured,
      arenaUsername: s.user.arenaUsername,
      createdAt: s.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { siteId, featured } = await req.json();

  if (!siteId || typeof featured !== "boolean") {
    return NextResponse.json(
      { error: "siteId and featured (boolean) are required" },
      { status: 400 }
    );
  }

  const site = await prisma.site.update({
    where: { id: siteId },
    data: { featured },
  });

  return NextResponse.json({
    id: site.id,
    subdomain: site.subdomain,
    featured: site.featured,
  });
}
