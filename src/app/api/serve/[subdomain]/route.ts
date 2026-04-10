import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { blobUrlForSiblingSiteFile, filenameFromServePath } from "@/lib/site-static-html";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const servePrefix = `/api/serve/${subdomain}`;
  const requestedName = filenameFromServePath(req.nextUrl.pathname, servePrefix);
  if (requestedName === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Check if site exists and is published
  const site = await prisma.site.findUnique({
    where: { subdomain },
    select: { blobUrl: true, published: true },
  });

  if (!site?.published) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (site?.blobUrl) {
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

  // Fallback: serve from local filesystem (dev)
  const generatedDir = path.join(process.cwd(), "generated", subdomain);

  let filePath = `/${requestedName}`;
  const fullPath = path.join(generatedDir, filePath);

  if (!fullPath.startsWith(generatedDir)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const content = await fs.readFile(fullPath);
    const ext = path.extname(fullPath);
    const contentTypes: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
    };

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
