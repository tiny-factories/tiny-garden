import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ArenaClient } from "@/lib/arena";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = new ArenaClient(session.arenaToken);

    // Fetch own channels
    const ownChannels = await client.getUserChannels(session.arenaUserId);

    // Fetch groups and their channels
    const groups = await client.getUserGroups(session.arenaUserId);
    const groupData = await Promise.all(
      groups.map(async (g) => {
        const channels = await client.getGroupChannels(g.id);
        return { id: g.id, slug: g.slug, name: g.name || g.slug, channels };
      })
    );

    return NextResponse.json({
      own: ownChannels,
      groups: groupData,
    });
  } catch (error) {
    console.error("Failed to fetch channels:", error);
    return NextResponse.json({ own: [], groups: [] }, { status: 200 });
  }
}
