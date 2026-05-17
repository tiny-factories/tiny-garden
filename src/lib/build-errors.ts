/** Prefix for persisted build/cron failures (stored in Site.lastBuildError). */
export const BUILD_ERROR_ARENA_AUTH = "arena:401";
export const BUILD_ERROR_ARENA_CHANNEL = "arena:404";

const CRON_SKIP_PREFIXES = [BUILD_ERROR_ARENA_AUTH, BUILD_ERROR_ARENA_CHANNEL] as const;

/** HTTP status from Are.na when the stored OAuth token is invalid or revoked. */
export function arenaStatusFromError(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const s = (error as { status: unknown }).status;
    if (typeof s === "number") return s;
  }
  const msg = error instanceof Error ? error.message : String(error);
  const m = msg.match(/Are\.na API error: (\d{3})/);
  return m ? parseInt(m[1]!, 10) : undefined;
}

export function buildErrorCodeForArenaStatus(status: number | undefined): string | null {
  if (status === 401 || status === 403) return BUILD_ERROR_ARENA_AUTH;
  if (status === 404) return BUILD_ERROR_ARENA_CHANNEL;
  return null;
}

/** Human-readable line for Site.lastBuildError (code prefix + short detail). */
export function formatPersistedBuildError(
  code: string | null,
  error: unknown
): string {
  const detail =
    error instanceof Error ? error.message : String(error);
  const clipped = detail.length > 500 ? `${detail.slice(0, 497)}...` : detail;
  if (code) return `${code}|${clipped}`;
  const truncated = detail.length > 2000 ? `${detail.slice(0, 1997)}...` : detail;
  return truncated;
}

export function isCronSkippableBuildError(lastBuildError: string | null | undefined): boolean {
  if (!lastBuildError) return false;
  if (CRON_SKIP_PREFIXES.some((p) => lastBuildError.startsWith(p))) return true;
  // Legacy plain-text errors from before structured codes.
  if (/Are\.na API error: 401\b/.test(lastBuildError)) return true;
  if (/Are\.na API error: 403\b/.test(lastBuildError)) return true;
  if (/Are\.na API error: 404\b/.test(lastBuildError)) return true;
  return false;
}

export function buildErrorCodeFromPersisted(
  lastBuildError: string | null | undefined
): string | null {
  if (!lastBuildError) return null;
  for (const p of CRON_SKIP_PREFIXES) {
    if (lastBuildError.startsWith(p)) return p;
  }
  return null;
}

/** Notify Discord only when the failure class changes or was previously healthy. */
export function shouldNotifyCronBuildFailure(
  previous: string | null | undefined,
  next: string
): boolean {
  if (!previous) return true;
  const prevCode = buildErrorCodeFromPersisted(previous);
  const nextCode = buildErrorCodeFromPersisted(next);
  if (prevCode && nextCode && prevCode === nextCode) return false;
  return previous !== next;
}
