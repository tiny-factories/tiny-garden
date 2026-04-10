import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  blobUrlForSiblingSiteFile,
  filenameFromServePath,
  filenameFromVisitorPath,
} from "@/lib/site-static-html";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;
  const servePrefix = `/api/serve/_custom/${domain}`;
  const visitorPath = req.headers.get("x-tiny-garden-site-path");
  const requestedName =
    visitorPath !== null
      ? filenameFromVisitorPath(visitorPath)
      : filenameFromServePath(req.nextUrl.pathname, servePrefix);
  if (requestedName === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  const site = await prisma.site.findUnique({
    where: { customDomain: domain },
    select: { blobUrl: true, published: true, domainVerified: true, subdomain: true },
  });

  if (!site?.published || !site.domainVerified) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (site.blobUrl) {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const targetUrl =
      requestedName === "index.html"
        ? site.blobUrl
        : blobUrlForSiblingSiteFile(site.blobUrl, requestedName);

    const res = await fetch(targetUrl, {
      headers: blobToken ? { Authorization: `Bearer ${blobToken}` } : {},
    });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    const html = await res.text();
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return new NextResponse("Not found", { status: 404 });
}
