import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

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
    select: {
      id: true,
      subdomain: true,
      published: true,
      lastBuiltAt: true,
      userId: true,
    },
  });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json(
      { error: "Not found", code: "not_found" },
      { status: 404 }
    );
  }

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";
  const url = `https://${site.subdomain}.${siteDomain}`;

  return NextResponse.json({
    siteId: site.id,
    subdomain: site.subdomain,
    url,
    published: site.published,
    lastBuiltAt: site.lastBuiltAt,
    contentType: "text/html",
  });
}
