import { NextRequest, NextResponse } from "next/server";
import {
  parseSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/session-crypto";
import { sessionCookieBaseOptions } from "@/lib/session-cookie-options";

export function middleware(req: NextRequest) {
  const rawHost = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  const host = rawHost.split(",")[0].trim();
  const hostname = host.split(":")[0] || host;
  const siteDomain = (process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0];
  const vercelUrl = (process.env.VERCEL_URL || "").toLowerCase().split(":")[0];
  const isVercelDeploymentHost = hostname.endsWith(".vercel.app") || (vercelUrl ? hostname === vercelUrl : false);

  if (process.env.NODE_ENV === "production" && req.nextUrl.pathname.startsWith("/dev")) {
    return new NextResponse(null, { status: 404 });
  }

  // Check if this is a subdomain request (e.g. my-site.tiny.garden)
  if (hostname.endsWith(`.${siteDomain}`) && hostname !== siteDomain && hostname !== `www.${siteDomain}`) {
    const subdomain = hostname.replace(`.${siteDomain}`, "");

    return NextResponse.rewrite(
      new URL(`/api/serve/${subdomain}${req.nextUrl.pathname}`, req.url)
    );
  }

  // Check if this is the main app domain
  const isAppDomain =
    hostname === siteDomain ||
    hostname === `www.${siteDomain}` ||
    hostname.startsWith("localhost") ||
    hostname.startsWith("127.0.0.1") ||
    isVercelDeploymentHost;

  // If not the app domain and not a subdomain, treat as custom domain
  if (!isAppDomain) {
    return NextResponse.rewrite(
      new URL(`/api/serve/_custom/${hostname}${req.nextUrl.pathname}`, req.url)
    );
  }

  // Protect dashboard routes — require a decryptable session (not just cookie presence).
  const isProtected =
    req.nextUrl.pathname.startsWith("/sites") ||
    req.nextUrl.pathname.startsWith("/site") ||
    req.nextUrl.pathname.startsWith("/account") ||
    req.nextUrl.pathname.startsWith("/admin");

  const rawSession = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionCookie(rawSession);

  if (isProtected && !session) {
    const login = NextResponse.redirect(new URL("/login", req.url));
    if (rawSession) {
      const base = sessionCookieBaseOptions();
      login.cookies.set(SESSION_COOKIE_NAME, "", {
        ...base,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
      });
    }
    return login;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs",
};
