import { NextRequest, NextResponse } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { channelBlocksForTemplate } from "@/lib/build";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

export const maxDuration = 60;

/**
 * List editable blocks for a site, sourced live from Are.na (not the build
 * cache) so the inline editor always shows the current canonical state.
 *
 * Returned shape is a subset of `TemplateBlock` plus a stable
 * `editableFields` hint that the UI uses to decide which inputs to render.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const client = new ArenaClient(auth.arenaToken);
  let raw;
  try {
    raw = await client.getAllChannelBlocks(site.channelSlug);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load blocks";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const blocks = channelBlocksForTemplate(raw).map((block) => ({
    id: block.id,
    type: block.type,
    title: block.title,
    description: block.description,
    content: block.content ?? null,
    position: block.position,
    updated_at: block.updated_at,
    arena_url: block.arena_url,
    image: block.image ? { display: block.image.display, square: block.image.square } : null,
    link: block.link ? { url: block.link.url, title: block.link.title, description: block.link.description } : null,
    attachment: block.attachment
      ? {
          file_name: block.attachment.file_name,
          kind: block.attachment.kind,
          preview_image_url: block.attachment.preview_image_url,
        }
      : null,
    /**
     * Tells the client which fields are user-editable on Are.na for this block type.
     * Are.na only accepts content on Text blocks; image/link/media/attachment blocks
     * are still editable for title/description.
     */
    editableFields: editableFieldsForType(block.type),
  }));

  return NextResponse.json({
    site: {
      id: site.id,
      subdomain: site.subdomain,
      channelSlug: site.channelSlug,
      channelTitle: site.channelTitle,
    },
    blocks,
  });
}

function editableFieldsForType(
  type: "image" | "text" | "link" | "media" | "attachment"
): Array<"title" | "description" | "content"> {
  if (type === "text") return ["title", "content"];
  return ["title", "description"];
}
