import { NextResponse } from "next/server";
import crypto from "crypto";
import { OAUTH_STATE_COOKIE } from "@/lib/oauth";

export async function GET() {
  const clientId = process.env.ARENA_CLIENT_ID;
  const redirectUri = process.env.ARENA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Are.na OAuth not configured" },
      { status: 500 }
    );
  }

  // CSRF protection: bind the OAuth round-trip to a random state value stored in
  // an httpOnly cookie, validated on callback. Without it, an attacker can feed
  // a victim their own authorization code and log them into the attacker's account.
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "write",
    state,
  });

  const res = NextResponse.redirect(
    `https://www.are.na/oauth/authorize?${params.toString()}`
  );
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — long enough to complete the login
  });
  return res;
}
