import { NextRequest, NextResponse, after } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { buildSite, channelBlocksForTemplate } from "@/lib/build";
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

/**
 * Create a new block in this site's Are.na channel.
 *
 * Body shapes:
 * - `{ type: "text", content: string, title?: string }`
 * - `{ type: "link", url: string, title?: string, description?: string }`
 * - `{ type: "image", url: string, title?: string, description?: string }`
 *   (URL-based; Are.na fetches the image. Direct file uploads are not in v1.)
 *
 * Queues a rebuild on success.
 */
export async function POST(
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

  let body: {
    type?: unknown;
    content?: unknown;
    url?: unknown;
    title?: unknown;
    description?: unknown;
    rebuild?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = body.type;
  const title = typeof body.title === "string" ? body.title.slice(0, 500) : undefined;
  const description =
    typeof body.description === "string"
      ? body.description.slice(0, 10_000)
      : undefined;

  const client = new ArenaClient(auth.arenaToken);

  try {
    let created;
    if (type === "text") {
      const content = typeof body.content === "string" ? body.content.slice(0, 50_000) : "";
      if (!content.trim()) {
        return NextResponse.json(
          { error: "content is required for text blocks" },
          { status: 400 }
        );
      }
      created = await client.createTextBlock(site.channelSlug, { content, title, description });
    } else if (type === "link") {
      const url = typeof body.url === "string" ? body.url.trim() : "";
      if (!url) {
        return NextResponse.json(
          { error: "url is required for link blocks" },
          { status: 400 }
        );
      }
      created = await client.createLinkBlock(site.channelSlug, { url, title, description });
    } else if (type === "image") {
      const url = typeof body.url === "string" ? body.url.trim() : "";
      if (!url) {
        return NextResponse.json(
          { error: "url is required for image blocks (v1 only supports image URLs)" },
          { status: 400 }
        );
      }
      created = await client.createImageBlockFromUrl(site.channelSlug, { url, title, description });
    } else {
      return NextResponse.json(
        { error: "type must be one of: text, link, image" },
        { status: 400 }
      );
    }

    const shouldRebuild = body.rebuild !== false;
    if (shouldRebuild) {
      after(() =>
        buildSite(id).catch((err) => {
          console.error("Rebuild after block create failed", id, created.id, err);
        })
      );
    }

    return NextResponse.json(
      {
        block: {
          id: created.id,
          title: created.title,
          updated_at: created.updated_at,
        },
        rebuildQueued: shouldRebuild,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create block";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
