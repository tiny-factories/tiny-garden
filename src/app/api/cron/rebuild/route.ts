import { NextRequest, NextResponse, after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma, withDbRetry } from "@/lib/db";
import { ArenaClient } from "@/lib/arena";
import { buildSite } from "@/lib/build";
import {
  BUILD_ERROR_ARENA_AUTH,
  BUILD_ERROR_ARENA_CHANNEL,
  arenaStatusFromError,
  buildErrorCodeForArenaStatus,
  buildErrorCodeFromPersisted,
  formatPersistedBuildError,
  isArenaAuthBuildErrorCode,
  isCronSkippableBuildError,
  persistedAuthPauseMessage,
  shouldNotifyCronBuildFailure,
} from "@/lib/build-errors";
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

  const total = await withDbRetry(
    () => prisma.site.count({ where: ELIGIBLE_SITE_WHERE }),
    { label: "cron/rebuild" }
  );
  const bucket = Math.floor(Date.now() / rotationMs);
  const effectiveSkip =
    total === 0 ? 0 : ((bucket * batchSize + continuation * batchSize) % total);

  const candidates = await withDbRetry(
    () =>
      prisma.site.findMany({
        where: ELIGIBLE_SITE_WHERE,
        orderBy: { id: "asc" },
        skip: effectiveSkip,
        take: batchSize,
        include: { user: { include: { subscription: true } } },
      }),
    { label: "cron/rebuild" }
  );

  console.info(
    `[cron/rebuild] phase=start eligible_total=${total} rotation_ms=${rotationMs} time_bucket=${bucket} skip=${effectiveSkip} batch=${batchSize} max_builds=${maxBuilds} candidates=${candidates.length} continuation=${continuation}`
  );

  let rebuilt = 0;
  let skippedUpToDate = 0;
  let skippedPaused = 0;
  let newlyPaused = 0;
  let failed = 0;
  let staleDeferred = 0;

  const candidateUserIds = [...new Set(candidates.map((s) => s.userId))];
  const usersWithKnownBadAuth =
    candidateUserIds.length > 0
      ? await withDbRetry(
          () =>
            prisma.site.findMany({
              where: {
                userId: { in: candidateUserIds },
                OR: [
                  { lastBuildError: { startsWith: BUILD_ERROR_ARENA_AUTH } },
                  { lastBuildError: { contains: "Are.na API error: 401" } },
                  { lastBuildError: { contains: "Are.na API error: 403" } },
                ],
              },
              select: { userId: true },
              distinct: ["userId"],
            }),
          { label: "cron/rebuild/bad_auth_users" }
        )
      : [];
  const userAuthFailed = new Set(usersWithKnownBadAuth.map((r) => r.userId));

  for (const site of candidates) {
    if (isCronSkippableBuildError(site.lastBuildError)) {
      skippedPaused++;
      console.info(
        `[cron/rebuild] site=${site.subdomain} action=skip_paused reason=${buildErrorCodeFromPersisted(site.lastBuildError)}`
      );
      continue;
    }

    if (userAuthFailed.has(site.userId)) {
      skippedPaused++;
      const notified = await markAuthPausedIfNeeded(site);
      if (notified) {
        newlyPaused++;
        void discordTeamNotify({
          title: `Cron rebuild: site paused (${site.subdomain})`,
          description:
            "Owner must log in again at tiny.garden to refresh their Are.na token. Cron will skip this site until then.",
          color: 0xfee75c,
          fields: [
            { name: "Subdomain", value: site.subdomain, inline: true },
            { name: "Channel", value: site.channelSlug, inline: true },
            { name: "Code", value: BUILD_ERROR_ARENA_AUTH, inline: true },
          ],
        });
      }
      console.info(
        `[cron/rebuild] site=${site.subdomain} action=skip_user_auth user=@${site.user.arenaUsername}`
      );
      continue;
    }

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
      const status = arenaStatusFromError(error);
      const code = buildErrorCodeForArenaStatus(status);
      const persisted = formatPersistedBuildError(code, error);
      const previous = site.lastBuildError;

      await withDbRetry(
        () =>
          prisma.site.update({
            where: { id: site.id },
            data: { lastBuildError: persisted },
          }),
        { label: "cron/rebuild/persist_error" }
      ).catch((e) => console.error(`[cron/rebuild] site=${site.subdomain} persist_error_failed`, e));

      if (isCronSkippableBuildError(persisted)) {
        if (isArenaAuthBuildErrorCode(code)) {
          userAuthFailed.add(site.userId);
        }
        skippedPaused++;
        console.warn(
          `[cron/rebuild] site=${site.subdomain} action=paused code=${code} status=${status ?? "unknown"}`
        );
      } else {
        failed++;
        console.error(`[cron/rebuild] site=${site.subdomain} action=build_failed`, error);
      }

      if (shouldNotifyCronBuildFailure(previous, persisted)) {
        if (isCronSkippableBuildError(persisted)) newlyPaused++;
        const hint =
          code === BUILD_ERROR_ARENA_AUTH
            ? "Owner must log in again at tiny.garden to refresh their Are.na token. Cron will skip this site until then."
            : code === BUILD_ERROR_ARENA_CHANNEL
              ? "Channel missing or slug changed — fix in site settings or unpublish. Cron will skip until resolved."
              : null;
        const errMsg = error instanceof Error ? error.message : String(error);
        void discordTeamNotify({
          title: `Cron rebuild: site paused (${site.subdomain})`,
          description: [hint, `\`\`\`${errMsg.slice(0, 3200)}\`\`\``].filter(Boolean).join("\n\n"),
          color: 0xfee75c,
          fields: [
            { name: "Subdomain", value: site.subdomain, inline: true },
            { name: "Channel", value: site.channelSlug, inline: true },
            { name: "Code", value: code ?? "transient", inline: true },
          ],
        });
      }
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
    skippedPaused,
    newlyPaused,
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

  const summaryWorthDiscord =
    rebuilt > 0 || failed > 0 || newlyPaused > 0 || staleDeferred > 0 || chainedAnother;

  if (summaryWorthDiscord) {
    const summaryColor =
      failed > 0 || newlyPaused > 0
        ? 0xfee75c
        : rebuilt > 0 || staleDeferred > 0
          ? 0x57f287
          : 0x99aab5;

    void discordTeamNotify({
      title: "Cron rebuild finished",
      description:
        failed > 0
          ? `Completed with **${failed}** failed site(s) (will retry next run).`
          : newlyPaused > 0
            ? `**${newlyPaused}** site(s) newly paused (bad token or missing channel).`
            : staleDeferred > 0
              ? `**${staleDeferred}** stale site(s) deferred (build cap).`
              : rebuilt > 0
                ? `Rebuilt **${rebuilt}** site(s).`
                : "Sweep completed.",
      color: summaryColor,
      url: `${origin}/sites`,
      fields: [
        { name: "Rebuilt", value: String(rebuilt), inline: true },
        { name: "Up to date", value: String(skippedUpToDate), inline: true },
        { name: "Paused (skipped)", value: String(skippedPaused), inline: true },
        { name: "Failed", value: String(failed), inline: true },
        { name: "Deferred", value: String(staleDeferred), inline: true },
        { name: "Eligible total", value: String(total), inline: true },
        { name: "Continuation", value: String(continuation), inline: true },
        { name: "Chained", value: chainedAnother ? "yes" : "no", inline: true },
      ],
    });
  }

  return NextResponse.json(payload);
}

/** Persist arena:401 without calling Are.na; returns whether Discord should fire. */
async function markAuthPausedIfNeeded(site: {
  id: string;
  subdomain: string;
  channelSlug: string;
  lastBuildError: string | null;
}): Promise<boolean> {
  const persisted = persistedAuthPauseMessage();
  const previous = site.lastBuildError;
  if (isCronSkippableBuildError(previous) && buildErrorCodeFromPersisted(previous) === BUILD_ERROR_ARENA_AUTH) {
    return false;
  }
  await withDbRetry(
    () =>
      prisma.site.update({
        where: { id: site.id },
        data: { lastBuildError: persisted },
      }),
    { label: "cron/rebuild/mark_auth_paused" }
  ).catch((e) => console.error(`[cron/rebuild] site=${site.subdomain} mark_auth_paused_failed`, e));
  return shouldNotifyCronBuildFailure(previous, persisted);
}
