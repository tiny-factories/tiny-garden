import { type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { resolveApiToken } from "@/lib/api-tokens";

export interface RequestAuth {
  userId: string;
  arenaToken: string;
  arenaUserId: number;
  arenaUsername: string;
  method: "session" | "token";
}

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (!scheme || !value) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return value.trim() || null;
}

export async function getRequestAuth(
  req: NextRequest
): Promise<RequestAuth | null> {
  const bearer = getBearerToken(req);
  if (bearer) {
    const tokenAuth = await resolveApiToken(bearer);
    if (tokenAuth) {
      return {
        userId: tokenAuth.userId,
        arenaToken: tokenAuth.arenaToken,
        arenaUserId: tokenAuth.arenaUserId,
        arenaUsername: tokenAuth.arenaUsername,
        method: "token",
      };
    }
  }

  const session = await getSession();
  if (!session) return null;

  return {
    userId: session.userId,
    arenaToken: session.arenaToken,
    arenaUserId: session.arenaUserId,
    arenaUsername: session.arenaUsername,
    method: "session",
  };
}

export async function requireRequestAuth(
  req: NextRequest
): Promise<RequestAuth | null> {
  return getRequestAuth(req);
}
