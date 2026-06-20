import { NextRequest, NextResponse } from "next/server";

/**
 * Strictly verify the URL points at our Vercel Blob store. A substring check is
 * not enough: `http://169.254.169.254/?vercel-storage.com` or
 * `http://vercel-storage.com.attacker.com/` would pass it, letting an attacker
 * proxy server-side requests (SSRF) and exfiltrate the blob bearer token.
 */
function isAllowedBlobUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return host === "vercel-storage.com" || host.endsWith(".vercel-storage.com");
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only allow fetching from our blob store (exact host match, not substring).
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken || !isAllowedBlobUrl(url)) {
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
