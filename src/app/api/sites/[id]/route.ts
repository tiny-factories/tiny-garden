import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { removeDomainFromVercel } from "@/lib/vercel";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Clean up custom domain from Vercel if set
  if (site.customDomain) {
    await removeDomainFromVercel(site.customDomain).catch(() => {});
  }

  await prisma.site.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.published === "boolean") data.published = body.published;
  if (typeof body.template === "string" && body.template) data.template = body.template;

  const updated = await prisma.site.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
