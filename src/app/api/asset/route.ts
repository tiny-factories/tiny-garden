import { NextRequest, NextResponse } from "next/server";
import { validateBlobUrl } from "@/lib/blob-url";

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return new NextResponse("Missing url", { status: 400 });

  // Only allow fetching from our blob store
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const parsedUrl = validateBlobUrl(rawUrl);
  if (!parsedUrl) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const res = await fetch(parsedUrl.toString(), {
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
