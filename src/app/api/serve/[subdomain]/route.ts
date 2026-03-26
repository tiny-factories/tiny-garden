import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { head } from "@vercel/blob";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;

  // Check if site exists and has a blob URL (production)
  const site = await prisma.site.findUnique({
    where: { subdomain },
    select: { blobUrl: true, published: true },
  });

  if (site?.blobUrl) {
    // Fetch from Vercel Blob (private store requires auth header)
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

  // Fallback: serve from local filesystem (dev)
  const generatedDir = path.join(process.cwd(), "generated", subdomain);

  let filePath = req.nextUrl.pathname.replace(`/api/serve/${subdomain}`, "");
  if (!filePath || filePath === "/") filePath = "/index.html";

  const fullPath = path.join(generatedDir, filePath);

  if (!fullPath.startsWith(generatedDir)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const content = await fs.readFile(fullPath);
    const ext = path.extname(fullPath);
    const contentTypes: Record<string, string> = {
      ".html": "text/html",
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
