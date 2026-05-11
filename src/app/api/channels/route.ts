import { NextRequest, NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/request-auth";
import { ArenaClient } from "@/lib/arena";

export const maxDuration = 30;

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

/**
 * Create a new Are.na channel owned by the authenticated user.
 *
 * Body: `{ title: string; status?: "public" | "closed" | "private" }`.
 *
 * Returns the new channel as Are.na reports it (we trust their canonical slug
 * and id rather than guessing from the title).
 */
export async function POST(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  let body: { title?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json(
      { error: "title is too long (max 200 chars)" },
      { status: 400 }
    );
  }

  let status: "public" | "closed" | "private" | undefined;
  if (
    body.status === "public" ||
    body.status === "closed" ||
    body.status === "private"
  ) {
    status = body.status;
  }

  const client = new ArenaClient(auth.arenaToken);
  try {
    const channel = await client.createChannel({ title, status });
    return NextResponse.json(
      {
        channel: {
          id: channel.id,
          title: channel.title,
          slug: channel.slug,
          length: channel.length ?? channel.counts?.contents ?? 0,
          created_at: channel.created_at,
          updated_at: channel.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create channel";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
