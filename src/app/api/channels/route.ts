import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const source = req.nextUrl.searchParams.get("source") || "own";

  try {
    const client = new ArenaClient(session.arenaToken);

    if (source === "own") {
      const channels = await client.getUserChannels(session.arenaUserId);
      return NextResponse.json(channels);
    }

    if (source === "groups") {
      const groups = await client.getUserGroups(session.arenaUserId);
      const groupData = await Promise.all(
        groups.map(async (g) => {
          const channels = await client.getGroupChannels(g.slug);
          return { id: g.id, slug: g.slug, name: g.name || g.slug, channels };
        })
      );
      return NextResponse.json(groupData);
    }

    if (source === "following") {
      const channels = await client.getFollowingChannels(session.arenaUserId);
      return NextResponse.json(channels);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error(`Failed to fetch channels (${source}):`, error);
    return NextResponse.json([], { status: 200 });
  }
}
