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
    console.log(`Own channels: ${ownChannels.length}`);

    // Fetch groups and their channels
    const groups = await client.getUserGroups(session.arenaUserId);
    console.log(`Groups found: ${groups.length}`, groups.map(g => ({ id: g.id, slug: g.slug, name: g.name })));

    const groupData = await Promise.all(
      groups.map(async (g) => {
        const channels = await client.getGroupChannels(g.id);
        console.log(`Group "${g.name || g.slug}" (id: ${g.id}): ${channels.length} channels`);
        return { id: g.id, slug: g.slug, name: g.name || g.slug, channels };
      })
    );

    // Fetch channels user follows/collaborates on
    const following = await client.getFollowingChannels(session.arenaUserId);
    console.log(`Following channels: ${following.length}`);

    return NextResponse.json({
      own: ownChannels,
      groups: groupData,
      following,
    });
  } catch (error) {
    console.error("Failed to fetch channels:", error);
    return NextResponse.json({ own: [], groups: [] }, { status: 200 });
  }
}
