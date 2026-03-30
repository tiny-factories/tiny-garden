import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;

  const site = await prisma.site.findUnique({
    where: { customDomain: domain },
    select: { blobUrl: true, published: true, domainVerified: true, subdomain: true },
  });

  if (!site?.published || !site?.domainVerified) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (site.blobUrl) {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(site.blobUrl, {
      headers: blobToken ? { Authorization: `Bearer ${blobToken}` } : {},
    });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    const html = await res.text();
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return new NextResponse("Not found", { status: 404 });
}
