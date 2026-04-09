import { prisma } from "@/lib/db";

/**
 * Token used to fetch Are.na data for public /templates previews when a channel is set in admin.
 * Set `ARENA_EXAMPLE_TOKEN` to a PAT for the account that owns the example channels; otherwise
 * the oldest admin user's OAuth token is used (handy for local dev).
 */
export async function getArenaTokenForTemplateExamples(): Promise<string | null> {
  const env = process.env.ARENA_EXAMPLE_TOKEN?.trim();
  if (env) return env;

  const admin = await prisma.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: "asc" },
    select: { arenaToken: true },
  });
  return admin?.arenaToken ?? null;
}
