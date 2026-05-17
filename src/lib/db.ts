import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const TRANSIENT_PRISMA_CODES = new Set([
  "P1001", // Can't reach database server (Neon cold start / network blip)
  "P1002", // Database server timed out (advisory lock / Neon wake)
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
]);

function isTransientPrismaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return false;
}

/**
 * Retry a database operation on transient connection errors (P1001, P1002, etc.).
 * Designed for Neon Postgres cold starts where the first connection attempt may
 * fail while the database is waking from suspension.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number; baseDelayMs?: number; label?: string }
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const baseDelayMs = opts?.baseDelayMs ?? 2000;
  const label = opts?.label ?? "db";

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientPrismaError(error) || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      const code =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : "init_error";
      console.warn(
        `[${label}] Transient DB error ${code} on attempt ${attempt}/${maxAttempts}, retrying in ${delayMs}ms…`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}
