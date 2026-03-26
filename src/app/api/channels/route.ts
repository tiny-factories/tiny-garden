import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = new ArenaClient(session.arenaToken);
    const channels = await client.getUserChannels(session.arenaUserId);
    return NextResponse.json(channels);
  } catch (error) {
    console.error("Failed to fetch channels:", error);
    return NextResponse.json([], { status: 200 });
  }
}
