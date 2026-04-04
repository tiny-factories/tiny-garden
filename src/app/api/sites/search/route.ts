import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const auth = await getRequestAuth(req);
  const scope = parseScope(req.nextUrl.searchParams.get("scope"));
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));

  if ((scope === "mine" || scope === "all") && !auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const minePromise =
    scope === "mine" || scope === "all"
      ? prisma.site.findMany({
          where: {
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
          },
          include: {
            user: { select: { arenaUsername: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]);

  const publicPromise =
    scope === "public" || scope === "all"
      ? prisma.site.findMany({
          where: {
            published: true,
            discoverable: true,
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
          },
          include: {
            user: { select: { arenaUsername: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]);

  const [mine, publicSites] = await Promise.all([minePromise, publicPromise]);
  const deduped = new Map<
    string,
    (typeof mine)[number] | (typeof publicSites)[number]
  >();

  for (const site of [...mine, ...publicSites]) deduped.set(site.id, site);

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";
  const items = Array.from(deduped.values())
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit)
    .map((site) => ({
      id: site.id,
      subdomain: site.subdomain,
      channelTitle: site.channelTitle,
      channelSlug: site.channelSlug,
      template: site.template,
      published: site.published,
      discoverable: site.discoverable,
      owner: {
        arenaUsername: site.user.arenaUsername,
        isSelf: auth ? site.userId === auth.userId : false,
      },
      url: `https://${site.subdomain}.${siteDomain}`,
      updatedAt: site.updatedAt,
    }));

  return NextResponse.json({ items, nextCursor: null });
}
