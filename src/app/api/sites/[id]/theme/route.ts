import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const site = await prisma.site.findUnique({
    where: { id },
    select: { themeColors: true, themeFonts: true, userId: true },
  });

  if (!site || site.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    colors: site.themeColors ? JSON.parse(site.themeColors) : null,
    fonts: site.themeFonts ? JSON.parse(site.themeFonts) : null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check plan — only admin, friend, pro, studio can customize themes
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { subscription: true },
  });

  const plan = user.subscription?.plan || "free";
  const canCustomize = user.isAdmin || user.isFriend || plan === "pro" || plan === "studio";
  if (!canCustomize) {
    return NextResponse.json(
      { error: "Upgrade to Pro to customize themes." },
      { status: 403 }
    );
  }

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { colors, fonts } = await req.json();

  await prisma.site.update({
    where: { id },
    data: {
      themeColors: colors ? JSON.stringify(colors) : null,
      themeFonts: fonts ? JSON.stringify(fonts) : null,
    },
  });

  return NextResponse.json({ success: true });
}
