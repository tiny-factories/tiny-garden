import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const client = new ArenaClient(session.arenaToken);
    const channels = await client.searchChannels(q);
    return NextResponse.json(channels);
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json([]);
  }
}
