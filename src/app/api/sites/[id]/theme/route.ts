import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";
import {
  normalizeThemeColorsInput,
  normalizeThemeFontsInput,
} from "@/lib/theme-css-tokens";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth)
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );

  const { id } = await params;
  const site = await prisma.site.findUnique({
    where: { id },
    select: { themeColors: true, themeFonts: true, userId: true },
  });

  if (!site || site.userId !== auth.userId) {
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
  const auth = await getRequestAuth(req);
  if (!auth)
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );

  const { id } = await params;

  // Check plan — only admin, friend, pro, studio can customize themes
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
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
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { colors, fonts } = await req.json();
  const normalizedColors = colors ? normalizeThemeColorsInput(colors) : null;
  const normalizedFonts = fonts ? normalizeThemeFontsInput(fonts) : null;
  if ((colors && !normalizedColors) || (fonts && !normalizedFonts)) {
    return NextResponse.json(
      { error: "Invalid theme payload" },
      { status: 400 }
    );
  }

  await prisma.site.update({
    where: { id },
    data: {
      themeColors: normalizedColors ? JSON.stringify(normalizedColors) : null,
      themeFonts: normalizedFonts ? JSON.stringify(normalizedFonts) : null,
    },
  });

  return NextResponse.json({ success: true });
}
