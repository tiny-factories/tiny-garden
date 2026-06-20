import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import { BUILD_ERROR_ARENA_AUTH } from "@/lib/build-errors";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { discordTeamNotify } from "@/lib/discord-team-notify";
import { OAUTH_STATE_COOKIE } from "@/lib/oauth";

/** Constant-time compare of two same-purpose hex strings. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }

  // CSRF protection: the state echoed back by Are.na must match the value we set
  // in the httpOnly cookie at /api/auth/login.
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!state || !expectedState || !safeEqual(state, expectedState)) {
    const res = NextResponse.redirect(
      new URL("/login?error=invalid_state", req.url)
    );
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  // Exchange code for token
  const tokenRes = await fetch("https://api.are.na/v3/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.ARENA_CLIENT_ID,
      client_secret: process.env.ARENA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.ARENA_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    const tokenError = await tokenRes.text();
    console.error("Token exchange failed:", tokenRes.status, tokenError);
    return NextResponse.redirect(new URL("/login?error=token_failed", req.url));
  }

  const tokenData = await tokenRes.json();
  const access_token = tokenData.access_token || tokenData.token;
  console.log("Token response keys:", Object.keys(tokenData));

  if (!access_token) {
    console.error("No access token in response:", tokenData);
    return NextResponse.redirect(new URL("/login?error=no_token", req.url));
  }

  // Fetch user info via v3 API
  const userRes = await fetch("https://api.are.na/v3/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    const userError = await userRes.text();
    console.error("User fetch failed:", userRes.status, userError);
    return NextResponse.redirect(new URL("/login?error=user_failed", req.url));
  }

  const arenaUser = await userRes.json();

  const existingUser = await prisma.user.findUnique({
    where: { arenaId: arenaUser.id },
    select: { id: true },
  });

  const user = await prisma.user.upsert({
    where: { arenaId: arenaUser.id },
    update: {
      arenaToken: access_token,
      arenaUsername: arenaUser.slug,
      avatarUrl: arenaUser.avatar_image?.display || null,
    },
    create: {
      arenaId: arenaUser.id,
      arenaUsername: arenaUser.slug,
      arenaToken: access_token,
      avatarUrl: arenaUser.avatar_image?.display || null,
      subscription: {
        create: { plan: "free" },
      },
    },
  });

  if (!existingUser) {
    const origin = req.nextUrl.origin;
    after(() =>
      discordTeamNotify({
        title: "New tiny.garden user",
        description: `First login — Are.na **@${arenaUser.slug}**`,
        url: `https://www.are.na/${arenaUser.slug}`,
        color: 0x57f287,
        fields: [{ name: "Open", value: `${origin}/sites`, inline: false }],
      })
    );
  }

  // Fresh OAuth token — allow cron to retry sites that were paused for arena:401.
  await prisma.site.updateMany({
    where: {
      userId: user.id,
      lastBuildError: { startsWith: BUILD_ERROR_ARENA_AUTH },
    },
    data: { lastBuildError: null },
  });

  await setSession({
    userId: user.id,
    arenaToken: access_token,
    arenaUserId: arenaUser.id,
    arenaUsername: arenaUser.slug,
  });

  const res = NextResponse.redirect(new URL("/sites?signed_in=1", req.url));
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
