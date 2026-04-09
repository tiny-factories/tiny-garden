import { cookies } from "next/headers";
import {
  decryptSessionPayload,
  encryptSessionPayload,
  parseSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/session-crypto";
import { sessionCookieBaseOptions } from "@/lib/session-cookie-options";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionData {
  userId: string;
  arenaToken: string;
  arenaUserId: number;
  arenaUsername: string;
}

export function sessionCookieOptions(nodeEnv = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

export async function setSession(data: SessionData) {
  const cookieStore = await cookies();
  const encrypted = encryptSessionPayload(JSON.stringify(data));
  const base = sessionCookieBaseOptions();
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...base,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  const parsed = parseSessionCookie(cookie?.value) as Partial<SessionData> | null;
  if (!parsed) return null;
  if (
    typeof parsed.userId !== "string" ||
    typeof parsed.arenaToken !== "string" ||
    typeof parsed.arenaUserId !== "number" ||
    typeof parsed.arenaUsername !== "string"
  ) {
    return null;
  }
  return parsed as SessionData;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const base = sessionCookieBaseOptions();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...base,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
}
