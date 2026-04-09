import { NextResponse } from "next/server";
import {
  createOAuthState,
  createOAuthStateCookieValue,
  OAUTH_STATE_COOKIE_NAME,
  oauthStateCookieOptions,
} from "@/lib/oauth-state";

export async function GET() {
  const clientId = process.env.ARENA_CLIENT_ID;
  const redirectUri = process.env.ARENA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Are.na OAuth not configured" },
      { status: 500 }
    );
  }

  const state = createOAuthState();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "write",
    state,
  });

  const response = NextResponse.redirect(
    `https://www.are.na/oauth/authorize?${params.toString()}`
  );
  response.cookies.set(
    OAUTH_STATE_COOKIE_NAME,
    createOAuthStateCookieValue(state),
    oauthStateCookieOptions()
  );
  return response;
}
