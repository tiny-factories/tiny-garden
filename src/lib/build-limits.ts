import { prisma } from "@/lib/db";

const SITE_COOLDOWN_SECONDS = 60 * 5;

const DAILY_BUILD_LIMITS: Record<string, number> = {
  free: 10,
  pro: 100,
  studio: 500,
};

export function getDailyBuildLimit(plan: string): number {
  return DAILY_BUILD_LIMITS[plan] ?? 10;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

interface BuildGuardInput {
  siteId: string;
  userId: string;
  plan: string;
  bypassLimits: boolean;
}

type BuildGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      code: "build_cooldown" | "build_quota_exceeded";
      message: string;
      details: Record<string, unknown>;
    };

export async function canRequestBuild(
  input: BuildGuardInput
): Promise<BuildGuardResult> {
  if (input.bypassLimits) return { allowed: true };

  const now = new Date();
  const [lastAccepted, acceptedToday] = await Promise.all([
    prisma.buildRequest.findFirst({
      where: {
        siteId: input.siteId,
        userId: input.userId,
        status: "accepted",
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.buildRequest.count({
      where: {
        userId: input.userId,
        status: "accepted",
        createdAt: { gte: startOfUtcDay(now) },
      },
    }),
  ]);

  if (lastAccepted) {
    const elapsedSeconds = Math.floor(
      (now.getTime() - lastAccepted.createdAt.getTime()) / 1000
    );
    if (elapsedSeconds < SITE_COOLDOWN_SECONDS) {
      return {
        allowed: false,
        code: "build_cooldown",
        message: `Rebuild cooldown active. Try again in ${SITE_COOLDOWN_SECONDS - elapsedSeconds}s.`,
        details: {
          retryAfterSeconds: SITE_COOLDOWN_SECONDS - elapsedSeconds,
        },
      };
    }
  }

  const limit = getDailyBuildLimit(input.plan);
  if (acceptedToday >= limit) {
    return {
      allowed: false,
      code: "build_quota_exceeded",
      message: "Daily rebuild quota reached for your plan.",
      details: {
        limit,
        used: acceptedToday,
        period: "day",
      },
    };
  }

  return { allowed: true };
}

