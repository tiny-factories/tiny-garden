import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

type SearchScope = "mine" | "public" | "all";

function parseScope(value: string | null): SearchScope {
  if (value === "public" || value === "all" || value === "mine") return value;
  return "mine";
}

function parseLimit(value: string | null): number {
  const n = Number(value || 20);
  if (!Number.isFinite(n)) return 20;
  return Math.max(1, Math.min(50, Math.trunc(n)));
}

function parsePage(value: string | null): number {
  const n = Number(value || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.trunc(n));
}

function mapSiteToItem(
  site: {
    id: string;
    userId: string;
    subdomain: string;
    channelTitle: string;
    channelSlug: string;
    template: string;
    published: boolean;
    updatedAt: Date;
    user: { arenaUsername: string };
  },
  authUserId: string | null,
  siteDomain: string
) {
  return {
    id: site.id,
    subdomain: site.subdomain,
    channelTitle: site.channelTitle,
    channelSlug: site.channelSlug,
    template: site.template,
    published: site.published,
    discoverable: true,
    owner: {
      arenaUsername: site.user.arenaUsername,
      isSelf: authUserId ? site.userId === authUserId : false,
    },
    url: `https://${site.subdomain}.${siteDomain}`,
    updatedAt: site.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  const scope = parseScope(req.nextUrl.searchParams.get("scope"));
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
  const page = parsePage(req.nextUrl.searchParams.get("page"));
  const skip = (page - 1) * limit;

  if ((scope === "mine" || scope === "all") && !auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";

  const publicWhere: Prisma.SiteWhereInput = {
    published: true,
    ...(q
      ? {
          OR: [
            { channelTitle: { contains: q, mode: "insensitive" } },
            { subdomain: { contains: q, mode: "insensitive" } },
            { template: { contains: q, mode: "insensitive" } },
            {
              user: {
                arenaUsername: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };

  const mineWhere: Prisma.SiteWhereInput = {
    userId: auth!.userId,
    ...(q
      ? {
          OR: [
            { channelTitle: { contains: q, mode: "insensitive" } },
            { subdomain: { contains: q, mode: "insensitive" } },
            { template: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (scope === "public") {
    const [rows, total] = await Promise.all([
      prisma.site.findMany({
        where: publicWhere,
        include: { user: { select: { arenaUsername: true } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.site.count({ where: publicWhere }),
    ]);
    const items = rows.map((site) =>
      mapSiteToItem(site, auth?.userId ?? null, siteDomain)
    );
    return NextResponse.json({
      items,
      total,
      page,
      limit,
      nextCursor: null,
    });
  }

  if (scope === "mine") {
    const [rows, total] = await Promise.all([
      prisma.site.findMany({
        where: mineWhere,
        include: { user: { select: { arenaUsername: true } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.site.count({ where: mineWhere }),
    ]);
    const items = rows.map((site) =>
      mapSiteToItem(site, auth!.userId, siteDomain)
    );
    return NextResponse.json({
      items,
      total,
      page,
      limit,
      nextCursor: null,
    });
  }

  const minePromise = prisma.site.findMany({
    where: mineWhere,
    include: { user: { select: { arenaUsername: true } } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const publicPromise = prisma.site.findMany({
    where: publicWhere,
    include: { user: { select: { arenaUsername: true } } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const [mine, publicSites] = await Promise.all([minePromise, publicPromise]);
  const deduped = new Map<
    string,
    (typeof mine)[number] | (typeof publicSites)[number]
  >();

  for (const site of [...mine, ...publicSites]) deduped.set(site.id, site);

  const items = Array.from(deduped.values())
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit)
    .map((site) => mapSiteToItem(site, auth!.userId, siteDomain));

  return NextResponse.json({ items, nextCursor: null });
}
