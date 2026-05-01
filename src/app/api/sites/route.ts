import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { seedFromSubdomain } from "@/lib/garden-icon";
import { buildSite } from "@/lib/build";
import { isBetaFull } from "@/lib/beta";
import { isKnownTemplateSlug } from "@/lib/templates-manifest";
import { getRequestAuth } from "@/lib/request-auth";
import { requireTrustedRequestOrigin } from "@/lib/csrf";
import { themeToDbFields } from "@/lib/ai-site-theme";

// POST returns quickly but runs buildSite in after(); that work shares this invocation’s limit.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const sites = await prisma.site.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }
  if (auth.method === "session") {
    const csrfError = requireTrustedRequestOrigin(req);
    if (csrfError) return csrfError;
  }

  const { channelSlug, channelTitle, template, subdomain, initialTheme } =
    await req.json();

  if (!channelSlug || !template || !subdomain) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!(await isKnownTemplateSlug(template))) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }

  // Check site limit based on plan
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
    include: { subscription: true, sites: true },
  });

  const plan = user.subscription?.plan || "free";

  if (
    (await isBetaFull()) &&
    !user.isAdmin &&
    !user.isFriend &&
    plan === "free"
  ) {
    return NextResponse.json(
      {
        error:
          "Beta is full for free accounts. Join the waitlist on the homepage, or log in and become a supporter for lifetime access.",
        code: "beta_full",
      },
      { status: 403 }
    );
  }

  const limits: Record<string, number> = { free: 3, pro: Infinity, studio: 50 };
  const limit = limits[plan] ?? 3;

  if (!user.isAdmin && !user.isFriend && user.sites.length >= limit) {
    return NextResponse.json(
      { error: `Your ${plan} plan allows ${limit} sites. Upgrade for more.` },
      { status: 403 }
    );
  }

  // Check subdomain availability
  const existing = await prisma.site.findUnique({ where: { subdomain } });
  if (existing) {
    return NextResponse.json({ error: "Subdomain taken" }, { status: 409 });
  }

  let themePayload: {
    themeColors: string;
    themeFonts: string;
    customCss?: string;
  } | undefined;
  if (initialTheme !== undefined && initialTheme !== null) {
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Initial theme is only available for admins." },
        { status: 403 }
      );
    }
    const parsed = themeToDbFields(initialTheme);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid initial theme payload" },
        { status: 400 }
      );
    }
    themePayload = parsed;
  }

  const site = await prisma.site.create({
    data: {
      subdomain,
      channelSlug,
      channelTitle: channelTitle || channelSlug,
      template,
      iconSeed: seedFromSubdomain(subdomain),
      userId: auth.userId,
      ...(themePayload && {
        themeColors: themePayload.themeColors,
        themeFonts: themePayload.themeFonts,
        ...(themePayload.customCss
          ? { customCss: themePayload.customCss }
          : {}),
      }),
    },
  });

  after(() =>
    buildSite(site.id).catch((err) => {
      console.error("Initial build failed for site", site.id, err);
    })
  );

  return NextResponse.json(site, { status: 201 });
}
