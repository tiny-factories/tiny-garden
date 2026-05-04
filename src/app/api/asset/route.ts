import { NextRequest, NextResponse } from "next/server";
import { isAllowedBlobAssetUrl } from "@/lib/blob-asset-proxy";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only allow fetching from our blob store
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken || !isAllowedBlobAssetUrl(url)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${blobToken}` },
    });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
