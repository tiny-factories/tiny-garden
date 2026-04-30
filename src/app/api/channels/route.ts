import { NextRequest, NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/request-auth";
import { ArenaClient } from "@/lib/arena";

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const source = req.nextUrl.searchParams.get("source") || "own";

  try {
    const client = new ArenaClient(auth.arenaToken);

    if (source === "own") {
      const channels = await client.getUserChannels(auth.arenaUserId);
      return NextResponse.json(channels);
    }

    if (source === "groups") {
      const groups = await client.getUserGroups(auth.arenaUserId);
      const groupData = await Promise.all(
        groups.map(async (g) => {
          const channels = await client.getGroupChannels(g.slug);
          return { id: g.id, slug: g.slug, name: g.name || g.slug, channels };
        })
      );
      return NextResponse.json(groupData);
    }

    if (source === "following") {
      const channels = await client.getFollowingChannels(auth.arenaUserId);
      return NextResponse.json(channels);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error(`Failed to fetch channels (${source}):`, error);
    return NextResponse.json([], { status: 200 });
  }
}
