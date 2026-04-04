import { NextRequest, NextResponse } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { getRequestAuth } from "@/lib/request-auth";

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const client = new ArenaClient(auth.arenaToken);
    const channels = await client.searchChannels(q);
    return NextResponse.json(channels);
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json([]);
  }
}
