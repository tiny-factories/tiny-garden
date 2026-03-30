import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { seedFromSubdomain } from "@/lib/garden-icon";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sites = await prisma.site.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelSlug, channelTitle, template, subdomain } = await req.json();

  if (!channelSlug || !template || !subdomain) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check site limit based on plan
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { subscription: true, sites: true },
  });

  const plan = user.subscription?.plan || "free";
  const limits: Record<string, number> = { free: 3, pro: Infinity, studio: 50 };
  const limit = limits[plan] ?? 3;

  if (!user.isAdmin && !user.isFriend && user.sites.length >= limit) {
    return NextResponse.json(
      { error: `Your ${plan} plan allows ${limit} sites. Upgrade for more.` },
      { status: 403 }
    );
  }

  // Check subdomain availability
  const existing = await prisma.site.findUnique({ where: { subdomain } });
  if (existing) {
    return NextResponse.json({ error: "Subdomain taken" }, { status: 409 });
  }

  const site = await prisma.site.create({
    data: {
      subdomain,
      channelSlug,
      channelTitle: channelTitle || channelSlug,
      template,
      iconSeed: seedFromSubdomain(subdomain),
      userId: session.userId,
    },
  });

  return NextResponse.json(site, { status: 201 });
}
