import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

const MAX_CSS_LENGTH = 100_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const site = await prisma.site.findUnique({
    where: { id },
    select: { id: true, userId: true, customCss: true, updatedAt: true },
  });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json(
      { error: "Not found", code: "not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    css: site.customCss || "",
    updatedAt: site.updatedAt,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const site = await prisma.site.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json(
      { error: "Not found", code: "not_found" },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { css?: unknown };
  const css = typeof body.css === "string" ? body.css : "";
  if (css.length > MAX_CSS_LENGTH) {
    return NextResponse.json(
      {
        error: `CSS exceeds max size (${MAX_CSS_LENGTH} chars).`,
        code: "css_too_large",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.site.update({
    where: { id },
    data: { customCss: css || null },
    select: { updatedAt: true, customCss: true },
  });

  return NextResponse.json({
    success: true,
    cssLength: (updated.customCss || "").length,
    updatedAt: updated.updatedAt,
  });
}
