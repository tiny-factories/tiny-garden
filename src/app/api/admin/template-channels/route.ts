import { NextRequest, NextResponse } from "next/server";
import { ArenaClient } from "@/lib/arena";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { loadTemplatesFromDisk } from "@/lib/templates-manifest";
import { getArenaTokenForTemplateExamples } from "@/lib/template-example-token";

function humanizeTemplateSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [templatesDisk, token] = await Promise.all([
    loadTemplatesFromDisk(),
    getArenaTokenForTemplateExamples(),
  ]);

  let rows = await prisma.templateExampleChannel.findMany().catch((err) => {
    console.error("template-channels: TemplateExampleChannel read failed", err);
    return [] as Awaited<ReturnType<typeof prisma.templateExampleChannel.findMany>>;
  });

  const diskIds = new Set(templatesDisk.map((t) => t.id));
  const dbSlugs = new Set(rows.map((r) => r.templateSlug));
  const allSlugs = [...new Set([...diskIds, ...dbSlugs])].sort((a, b) =>
    a.localeCompare(b)
  );

  try {
    if (allSlugs.length > 0) {
      await prisma.templateExampleChannel.createMany({
        data: allSlugs.map((templateSlug) => ({
          templateSlug,
          channelSlug: null,
        })),
        skipDuplicates: true,
      });
      rows = await prisma.templateExampleChannel.findMany().catch(() => rows);
    }
  } catch (err) {
    console.error("template-channels: ensure rows from disk + DB slugs", err);
  }

  const bySlug = new Map(rows.map((r) => [r.templateSlug, r]));
  const diskById = new Map(templatesDisk.map((t) => [t.id, t]));

  const merged = allSlugs.map((slug) => {
    const d = diskById.get(slug);
    const row = bySlug.get(slug);
    const dbOnly = !d;
    return {
      id: slug,
      name: d?.name ?? humanizeTemplateSlug(slug),
      description:
        d?.description ??
        (dbOnly
          ? "Template folder not available on this server; row comes from the database (e.g. after migrate). Deploy includes templates/ for full names and descriptions."
          : ""),
      channelSlug: row?.channelSlug ?? null,
      channelTitle: row?.channelTitle ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    hasExampleToken: !!token,
    templates: merged,
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

  const templatesDisk = await loadTemplatesFromDisk();
  const existingRow = await prisma.templateExampleChannel.findUnique({
    where: { templateSlug },
  });
  const knownFromDisk = templatesDisk.some((t) => t.id === templateSlug);
  if (!knownFromDisk && !existingRow) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  if (!rawChannel) {
    await prisma.templateExampleChannel.upsert({
      where: { templateSlug },
      create: { templateSlug, channelSlug: null, channelTitle: null },
      update: { channelSlug: null, channelTitle: null },
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
