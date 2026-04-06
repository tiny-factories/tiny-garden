import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

/**
 * Owner-only preview of the last successful build (blob or local generated/).
 * Unlike /api/serve/[subdomain], does not require published — for dashboard iframe.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; path?: string[] }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id, path: pathParts } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
    select: {
      userId: true,
      subdomain: true,
      blobUrl: true,
      lastBuiltAt: true,
    },
  });

  if (!site || site.userId !== auth.userId) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!site.lastBuiltAt) {
    return new NextResponse("Not built yet", { status: 404 });
  }

  const joined =
    pathParts && pathParts.length > 0
      ? path.posix.join(...pathParts.map((p) => path.posix.normalize(p)))
      : "";
  if (joined.includes("..")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const subPath = joined && joined !== "." ? joined : "index.html";

  if (site.blobUrl) {
    const wantsIndex = subPath === "index.html" || !joined;
    if (!wantsIndex) {
      return new NextResponse("Not found", { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(site.blobUrl, {
      headers: blobToken ? { Authorization: `Bearer ${blobToken}` } : {},
    });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    const html = await res.text();
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  }

  const generatedDir = path.join(process.cwd(), "generated", site.subdomain);
  const baseResolved = path.resolve(generatedDir);
  const fullPath = path.resolve(baseResolved, subPath);

  if (fullPath !== baseResolved && !fullPath.startsWith(baseResolved + path.sep)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const stat = await fs.stat(fullPath);
    const filePath = stat.isDirectory() ? path.join(fullPath, "index.html") : fullPath;
    if (filePath !== baseResolved && !filePath.startsWith(baseResolved + path.sep)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const contentTypes: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
