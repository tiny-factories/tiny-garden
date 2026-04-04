import { NextRequest, NextResponse } from "next/server";
import { loadTemplatesFromDisk } from "@/lib/templates-manifest";
import { getRequestAuth } from "@/lib/request-auth";

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const templates = await loadTemplatesFromDisk();
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json([]);
  }
}
