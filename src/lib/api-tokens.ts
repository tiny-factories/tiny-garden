import crypto from "crypto";
import { prisma } from "@/lib/db";

const TOKEN_PREFIX = "tg_pat_";

export interface TokenAuthUser {
  userId: string;
  arenaToken: string;
  arenaUserId: number;
  arenaUsername: string;
}

export function createPlaintextToken(): string {
  const suffix = crypto.randomBytes(24).toString("base64url");
  return `${TOKEN_PREFIX}${suffix}`;
}

export function hashApiToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildTokenPrefix(token: string): string {
  return token.slice(0, Math.min(token.length, 16));
}

export function parseExpiryDays(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  return Math.min(3650, Math.floor(num));
}

export async function resolveApiToken(
  plaintextToken: string
): Promise<TokenAuthUser | null> {
  if (!plaintextToken || !plaintextToken.startsWith(TOKEN_PREFIX)) return null;

  const now = new Date();
  const tokenHash = hashApiToken(plaintextToken);
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          arenaId: true,
          arenaUsername: true,
          arenaToken: true,
        },
      },
    },
  });

  if (!token) return null;
  if (token.revokedAt) return null;
  if (token.expiresAt && token.expiresAt <= now) return null;

  await prisma.apiToken
    .update({
      where: { id: token.id },
      data: { lastUsedAt: now },
    })
    .catch(() => {});

  return {
    userId: token.user.id,
    arenaToken: token.user.arenaToken,
    arenaUserId: token.user.arenaId,
    arenaUsername: token.user.arenaUsername,
  };
}

