import { NextRequest, NextResponse, after } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { buildSite } from "@/lib/build";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

export const maxDuration = 60;

/**
 * Update a single Are.na block belonging to a site's channel, using the
 * caller's Are.na OAuth token. Triggers a background rebuild so the static
 * site reflects the change.
 *
 * Authorization model: a user may patch any block in a channel they own a
 * tiny.garden site for. We do NOT verify that Are.na considers them owner of
 * the block — Are.na enforces that itself and will return 401/403 if not.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const { id, blockId: blockIdRaw } = await params;
  const blockId = Number.parseInt(blockIdRaw, 10);
  if (!Number.isFinite(blockId) || blockId <= 0) {
    return NextResponse.json({ error: "Invalid block id" }, { status: 400 });
  }

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { title?: unknown; description?: unknown; content?: unknown; rebuild?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: { title?: string; description?: string | null; content?: string | null } = {};
  if (typeof body.title === "string") patch.title = body.title.slice(0, 500);
  if (body.description === null || typeof body.description === "string") {
    patch.description = body.description === null ? "" : String(body.description).slice(0, 10_000);
  }
  if (body.content === null || typeof body.content === "string") {
    patch.content = body.content === null ? "" : String(body.content).slice(0, 50_000);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No editable fields supplied" },
      { status: 400 }
    );
  }

  const client = new ArenaClient(auth.arenaToken);
  let updated;
  try {
    updated = await client.updateBlock(blockId, patch);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Are.na update failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const shouldRebuild = body.rebuild !== false; // default true
  if (shouldRebuild) {
    after(() =>
      buildSite(id).catch((rebuildErr) => {
        console.error("Rebuild after block edit failed", id, blockId, rebuildErr);
      })
    );
  }

  return NextResponse.json({
    block: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      content: typeof updated.content === "string" ? updated.content : null,
      updated_at: updated.updated_at,
    },
    rebuildQueued: shouldRebuild,
  });
}
