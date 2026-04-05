import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { removeDomainFromVercel } from "@/lib/vercel";
import { isKnownTemplateSlug } from "@/lib/templates-manifest";
import { getRequestAuth } from "@/lib/request-auth";
import { requireTrustedRequestOrigin } from "@/lib/csrf";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = requireTrustedRequestOrigin(req);
  if (csrfError) return csrfError;

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
  const csrfError = requireTrustedRequestOrigin(req);
  if (csrfError) return csrfError;

  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await req.json();

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.published === "boolean") data.published = body.published;
  if (typeof body.template === "string" && body.template) {
    if (!(await isKnownTemplateSlug(body.template))) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
    data.template = body.template;
  }

  const updated = await prisma.site.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
