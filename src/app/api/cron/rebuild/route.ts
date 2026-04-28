import { NextRequest, NextResponse, after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ArenaClient } from "@/lib/arena";
import { buildSite } from "@/lib/build";
import { discordTeamNotify } from "@/lib/discord-team-notify";

export const maxDuration = 300;

/** Published sites for Pro/Studio (and staff) — same cohort as before. */
const ELIGIBLE_SITE_WHERE: Prisma.SiteWhereInput = {
  published: true,
  user: {
    OR: [
      { isAdmin: true },
      { isFriend: true },
      { subscription: { plan: { in: ["pro", "studio"] } } },
    ],
  },
};

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await executeCronRebuild(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron/rebuild] phase=handler_failed", error);
    void discordTeamNotify({
      title: "Cron rebuild crashed",
      description: `Uncaught error before or during sweep.\n\`\`\`${message.slice(0, 3500)}\`\`\``,
      color: 0xed4245,
    });
    return NextResponse.json({ error: "Cron failed", code: "cron_error" }, { status: 500 });
  }
}

async function executeCronRebuild(req: NextRequest): Promise<NextResponse> {
  const batchSize = intEnv("CRON_REBUILD_CANDIDATE_BATCH", 30);
  const maxBuilds = intEnv("CRON_REBUILD_MAX_BUILDS_PER_RUN", 4);
  // Default 15m matches vercel.json `0,15,30,45 * * * *` so each sweep advances the slice.
  const rotationMs = Math.max(60_000, intEnv("CRON_REBUILD_ROTATION_MS", 900_000));
  const maxAutoContinuations = intEnv("CRON_REBUILD_MAX_AUTO_CONTINUATIONS", 3);
  const continuation = Math.min(
    Math.max(0, parseInt(req.nextUrl.searchParams.get("continuation") || "0", 10) || 0),
    50
  );

  const total = await prisma.site.count({ where: ELIGIBLE_SITE_WHERE });
  const bucket = Math.floor(Date.now() / rotationMs);
  const effectiveSkip =
    total === 0 ? 0 : ((bucket * batchSize + continuation * batchSize) % total);

  const candidates = await prisma.site.findMany({
    where: ELIGIBLE_SITE_WHERE,
    orderBy: { id: "asc" },
    skip: effectiveSkip,
    take: batchSize,
    include: { user: { include: { subscription: true } } },
  });

  console.info(
    `[cron/rebuild] phase=start eligible_total=${total} rotation_ms=${rotationMs} time_bucket=${bucket} skip=${effectiveSkip} batch=${batchSize} max_builds=${maxBuilds} candidates=${candidates.length} continuation=${continuation}`
  );

  let rebuilt = 0;
  let skippedUpToDate = 0;
  let failed = 0;
  let staleDeferred = 0;

  for (const site of candidates) {
    try {
      const client = new ArenaClient(site.user.arenaToken);
      const channel = await client.getChannel(site.channelSlug);
      const channelUpdated = new Date(channel.updated_at);
      const mustBuild = !site.lastBuiltAt || channelUpdated > site.lastBuiltAt;
      if (!mustBuild) {
        skippedUpToDate++;
        continue;
      }

      if (rebuilt >= maxBuilds) {
        staleDeferred++;
        console.info(
          `[cron/rebuild] site=${site.subdomain} action=defer_build reason=max_builds_per_run channel_updated=${channelUpdated.toISOString()} last_built=${site.lastBuiltAt?.toISOString() ?? "null"}`
        );
        continue;
      }

      console.info(
        `[cron/rebuild] site=${site.subdomain} action=build_start channel_updated=${channelUpdated.toISOString()} last_built=${site.lastBuiltAt?.toISOString() ?? "null"}`
      );
      await buildSite(site.id);
      await new Promise((r) => setTimeout(r, 1000));
      rebuilt++;
      console.info(`[cron/rebuild] site=${site.subdomain} action=build_done`);
    } catch (error) {
      console.error(`[cron/rebuild] site=${site.subdomain} action=build_failed`, error);
      failed++;
      const errMsg = error instanceof Error ? error.message : String(error);
      void discordTeamNotify({
        title: `Cron rebuild: site failed (${site.subdomain})`,
        description: `\`\`\`${errMsg.slice(0, 3500)}\`\`\``,
        color: 0xfee75c,
        fields: [
          { name: "Subdomain", value: site.subdomain, inline: true },
          { name: "Channel", value: site.channelSlug, inline: true },
        ],
      });
    }
  }

  const origin = req.nextUrl.origin;
  const secret = process.env.CRON_SECRET;
  const chainedAnother =
    staleDeferred > 0 &&
    process.env.CRON_REBUILD_AUTO_CONTINUE === "1" &&
    Boolean(secret) &&
    continuation < maxAutoContinuations;

  if (chainedAnother && secret) {
    after(async () => {
      const next = new URL("/api/cron/rebuild", origin);
      next.searchParams.set("continuation", String(continuation + 1));
      try {
        const r = await fetch(next, {
          headers: { Authorization: `Bearer ${secret}` },
          cache: "no-store",
        });
        console.info(
          `[cron/rebuild] phase=chained_continuation continuation=${continuation + 1} http_status=${r.status}`
        );
      } catch (e) {
        console.error("[cron/rebuild] phase=chained_continuation_error", e);
        void discordTeamNotify({
          title: "Cron rebuild: continuation request failed",
          description: String(e instanceof Error ? e.message : e).slice(0, 3500),
          color: 0xed4245,
        });
      }
    });
  }

  const payload = {
    rebuilt,
    skippedUpToDate,
    failed,
    staleDeferred,
    eligibleTotal: total,
    candidateBatch: candidates.length,
    skip: effectiveSkip,
    batchSize,
    maxBuildsPerRun: maxBuilds,
    continuation,
    chainedAnother,
    rotationMs,
    timeBucket: bucket,
  };

  const summaryColor =
    failed > 0 ? 0xfee75c : rebuilt > 0 || staleDeferred > 0 ? 0x57f287 : 0x99aab5;

  void discordTeamNotify({
    title: "Cron rebuild finished",
    description:
      failed > 0
        ? `Completed with **${failed}** failed site(s).`
        : staleDeferred > 0
          ? `**${staleDeferred}** stale site(s) deferred (build cap).`
          : "Sweep completed.",
    color: summaryColor,
    url: `${origin}/sites`,
    fields: [
      { name: "Rebuilt", value: String(rebuilt), inline: true },
      { name: "Up to date", value: String(skippedUpToDate), inline: true },
      { name: "Failed", value: String(failed), inline: true },
      { name: "Deferred", value: String(staleDeferred), inline: true },
      { name: "Eligible total", value: String(total), inline: true },
      { name: "Continuation", value: String(continuation), inline: true },
      { name: "Chained", value: chainedAnother ? "yes" : "no", inline: true },
    ],
  });

  return NextResponse.json(payload);
}
