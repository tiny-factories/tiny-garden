import { cookies } from "next/headers";
import {
  encryptSessionPayload,
  parseSessionCookie,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from "@/lib/session-crypto";
import { sessionCookieBaseOptions } from "@/lib/session-cookie-options";

export type SessionData = SessionPayload;

export async function setSession(data: SessionData) {
  const cookieStore = await cookies();
  const encrypted = encryptSessionPayload(JSON.stringify(data));
  const base = sessionCookieBaseOptions();
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    ...base,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  return parseSessionCookie(cookie?.value);
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

export { parseSessionCookie, SESSION_COOKIE_NAME };
