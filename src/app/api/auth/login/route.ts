import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.ARENA_CLIENT_ID;
  const redirectUri = process.env.ARENA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Are.na OAuth not configured" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "write",
  });

  return NextResponse.redirect(
    `https://www.are.na/oauth/authorize?${params.toString()}`
  );
}
