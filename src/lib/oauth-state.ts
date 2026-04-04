import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  decryptSessionPayload,
  encryptSessionPayload,
} from "@/lib/session-crypto";

export const OAUTH_STATE_COOKIE_NAME = "arena_oauth_state";
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

interface OAuthStatePayload {
  value: string;
  exp: number;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function createOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export const generateOAuthState = createOAuthState;

export function createOAuthStateCookieValue(state: string): string {
  const payload: OAuthStatePayload = {
    value: state,
    exp: nowSeconds() + OAUTH_STATE_TTL_SECONDS,
  };
  return encryptSessionPayload(JSON.stringify(payload));
}

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyOAuthState(
  cookieValue: string | undefined,
  returnedState: string | null
): boolean {
  if (!cookieValue || !returnedState) return false;
  try {
    const payload = JSON.parse(
      decryptSessionPayload(cookieValue)
    ) as OAuthStatePayload;
    if (
      !payload ||
      typeof payload.value !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return false;
    }
    if (payload.exp < nowSeconds()) return false;
    return safeEquals(payload.value, returnedState);
  } catch {
    return false;
  }
}

export function oauthStateCookieOptions(nodeEnv = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax" as const,
    maxAge: OAUTH_STATE_TTL_SECONDS,
    path: "/",
  };
}

export async function setOAuthStateCookie(
  state: string,
  response?: NextResponse
): Promise<void> {
  const value = createOAuthStateCookieValue(state);
  if (response) {
    response.cookies.set(
      OAUTH_STATE_COOKIE_NAME,
      value,
      oauthStateCookieOptions()
    );
    return;
  }
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, value, oauthStateCookieOptions());
}

export async function validateAndClearOAuthState(
  returnedState: string | null
): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);
  return verifyOAuthState(cookieValue, returnedState);
}
