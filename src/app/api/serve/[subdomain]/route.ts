import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const generatedDir = path.join(process.cwd(), "generated", subdomain);

  // Determine which file to serve
  let filePath = req.nextUrl.pathname.replace(`/api/serve/${subdomain}`, "");
  if (!filePath || filePath === "/") filePath = "/index.html";


  const fullPath = path.join(generatedDir, filePath);

  // Prevent path traversal
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
