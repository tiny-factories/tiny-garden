import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { BETA_SPOTS, getBetaAccessCount } from "@/lib/beta";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
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

  // Check if this is a new user and if beta spots are available
  const existingUser = await prisma.user.findUnique({
    where: { arenaId: arenaUser.id },
  });

  let grantFriend = false;
  if (!existingUser) {
    const betaAccessCount = await getBetaAccessCount();
    grantFriend = betaAccessCount < BETA_SPOTS;
  }

  // Upsert user
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
      isFriend: grantFriend,
      subscription: {
        create: { plan: "free" },
      },
    },
  });

  await setSession({
    userId: user.id,
    arenaToken: access_token,
    arenaUserId: arenaUser.id,
    arenaUsername: arenaUser.slug,
  });

  return NextResponse.redirect(new URL("/sites", req.url));
}
