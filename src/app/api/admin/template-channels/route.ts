import { NextRequest, NextResponse } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { loadTemplatesFromDisk } from "@/lib/templates-manifest";
import { getArenaTokenForTemplateExamples } from "@/lib/template-example-token";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [templates, rows, token] = await Promise.all([
    loadTemplatesFromDisk(),
    prisma.templateExampleChannel.findMany().catch((err) => {
      console.error("template-channels: TemplateExampleChannel read failed", err);
      return [];
    }),
    getArenaTokenForTemplateExamples(),
  ]);

  const bySlug = new Map(rows.map((r) => [r.templateSlug, r]));

  return NextResponse.json({
    hasExampleToken: !!token,
    templates: templates.map((t) => {
      const row = bySlug.get(t.id);
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        channelSlug: row?.channelSlug ?? null,
        channelTitle: row?.channelTitle ?? null,
        updatedAt: row?.updatedAt.toISOString() ?? null,
      };
    }),
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const templateSlug =
    typeof body.templateSlug === "string" ? body.templateSlug.trim() : "";
  const rawChannel =
    typeof body.channelSlug === "string" ? body.channelSlug.trim() : "";

  if (!templateSlug) {
    return NextResponse.json(
      { error: "templateSlug is required" },
      { status: 400 }
    );
  }

  const templates = await loadTemplatesFromDisk();
  if (!templates.some((t) => t.id === templateSlug)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  if (!rawChannel) {
    await prisma.templateExampleChannel.deleteMany({
      where: { templateSlug },
    });
    return NextResponse.json({ ok: true, templateSlug, channelSlug: null });
  }

  const token = await getArenaTokenForTemplateExamples();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "No Are.na token available. Set ARENA_EXAMPLE_TOKEN or ensure an admin user exists with a valid OAuth session.",
      },
      { status: 503 }
    );
  }

  const client = new ArenaClient(token);
  let channel;
  try {
    channel = await client.getChannel(rawChannel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load channel";
    return NextResponse.json(
      { error: `Are.na: ${msg}. Check the channel slug (same as in the site picker).` },
      { status: 400 }
    );
  }

  const row = await prisma.templateExampleChannel.upsert({
    where: { templateSlug },
    create: {
      templateSlug,
      channelSlug: channel.slug,
      channelTitle: channel.title,
    },
    update: {
      channelSlug: channel.slug,
      channelTitle: channel.title,
    },
  });

  return NextResponse.json({
    ok: true,
    templateSlug: row.templateSlug,
    channelSlug: row.channelSlug,
    channelTitle: row.channelTitle,
    updatedAt: row.updatedAt.toISOString(),
  });
}
