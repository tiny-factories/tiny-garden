import { prisma } from "@/lib/db";

export const BETA_SPOTS = 50;

/** Users who count toward closed-beta capacity (matches OAuth friend-grant logic). */
export async function getBetaAccessCount(): Promise<number> {
  return prisma.user.count({
    where: { OR: [{ isFriend: true }, { isAdmin: true }] },
  });
}

export async function getBetaSpotsRemaining(): Promise<number> {
  try {
    const used = await getBetaAccessCount();
    return Math.max(BETA_SPOTS - used, 0);
  } catch {
    return BETA_SPOTS;
  }
}

export async function isBetaFull(): Promise<boolean> {
  const used = await getBetaAccessCount();
  return used >= BETA_SPOTS;
}
