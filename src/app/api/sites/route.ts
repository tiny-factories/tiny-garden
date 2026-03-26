import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

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

  // Check site limit for free plan
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { subscription: true, sites: true },
  });

  const isFree = !user.subscription || user.subscription.plan === "free";
  if (isFree && !user.isAdmin && user.sites.length >= 1) {
    return NextResponse.json(
      { error: "Free plan allows 1 site. Upgrade to Pro for unlimited sites." },
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
      userId: session.userId,
    },
  });

  return NextResponse.json(site, { status: 201 });
}
