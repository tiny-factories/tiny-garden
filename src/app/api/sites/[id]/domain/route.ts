import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  addDomainToVercel,
  removeDomainFromVercel,
  getProjectDomain,
  getDomainConfig,
} from "@/lib/vercel";

async function getSiteForUser(id: string, userId: string) {
  const site = await prisma.site.findUnique({
    where: { id },
    include: { user: { include: { subscription: true } } },
  });
  if (!site || site.userId !== userId) return null;
  return site;
}

function canUseDomains(user: { isAdmin: boolean; isFriend: boolean; subscription: { plan: string } | null }): boolean {
  if (user.isAdmin || user.isFriend) return true;
  const plan = user.subscription?.plan || "free";
  return plan === "pro" || plan === "studio";
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

// POST — Add a custom domain
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const site = await getSiteForUser(id, session.userId);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canUseDomains(site.user)) {
    return NextResponse.json({ error: "Custom domains require a Pro or Studio plan." }, { status: 403 });
  }

  const { domain } = await req.json();
  const cleaned = (domain || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");

  if (!cleaned || !DOMAIN_RE.test(cleaned)) {
    return NextResponse.json({ error: "Invalid domain format." }, { status: 400 });
  }

  // Check not already taken by another site
  const existing = await prisma.site.findUnique({ where: { customDomain: cleaned } });
  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "This domain is already in use by another site." }, { status: 409 });
  }

  try {
    // If site already has a different domain, remove the old one first
    if (site.customDomain && site.customDomain !== cleaned) {
      await removeDomainFromVercel(site.customDomain).catch(() => {});
    }

    const vercelDomain = await addDomainToVercel(cleaned);

    await prisma.site.update({
      where: { id },
      data: { customDomain: cleaned, domainVerified: false },
    });

    // Get DNS config to show the user
    let config = null;
    try {
      config = await getDomainConfig(cleaned);
    } catch {}

    return NextResponse.json({
      domain: cleaned,
      verified: vercelDomain.verified,
      verification: vercelDomain.verification || [],
      config,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add domain";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — Check domain status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const site = await getSiteForUser(id, session.userId);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!site.customDomain) {
    return NextResponse.json({ domain: null });
  }

  try {
    const [projectDomain, config] = await Promise.all([
      getProjectDomain(site.customDomain),
      getDomainConfig(site.customDomain),
    ]);

    const verified = projectDomain.verified && !config.misconfigured;

    // Update DB if verification state changed
    if (verified !== site.domainVerified) {
      await prisma.site.update({
        where: { id },
        data: { domainVerified: verified },
      });
    }

    return NextResponse.json({
      domain: site.customDomain,
      verified,
      misconfigured: config.misconfigured,
      verification: projectDomain.verification || [],
      config: {
        cnames: config.cnames,
        aValues: config.aValues,
      },
    });
  } catch (error) {
    // If Vercel API fails, return what we know from DB
    return NextResponse.json({
      domain: site.customDomain,
      verified: site.domainVerified,
      misconfigured: null,
      verification: [],
      config: null,
    });
  }
}

// DELETE — Remove custom domain
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const site = await getSiteForUser(id, session.userId);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!site.customDomain) {
    return NextResponse.json({ success: true });
  }

  try {
    await removeDomainFromVercel(site.customDomain);
  } catch {
    // Continue even if Vercel removal fails
  }

  await prisma.site.update({
    where: { id },
    data: { customDomain: null, domainVerified: false },
  });

  return NextResponse.json({ success: true });
}
