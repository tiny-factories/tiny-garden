import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";

  // Check if this is a subdomain request (e.g. my-site.tiny.garden)
  if (host.endsWith(`.${siteDomain}`) && host !== siteDomain && host !== `www.${siteDomain}`) {
    const subdomain = host.replace(`.${siteDomain}`, "");

    return NextResponse.rewrite(
      new URL(`/api/serve/${subdomain}${req.nextUrl.pathname}`, req.url)
    );
  }

  // Check if this is the main app domain
  const isAppDomain =
    host === siteDomain ||
    host === `www.${siteDomain}` ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1");

  // If not the app domain and not a subdomain, treat as custom domain
  if (!isAppDomain) {
    return NextResponse.rewrite(
      new URL(`/api/serve/_custom/${host}${req.nextUrl.pathname}`, req.url)
    );
  }

  // Protect dashboard routes
  const isProtected = req.nextUrl.pathname.startsWith("/sites") || req.nextUrl.pathname.startsWith("/site") || req.nextUrl.pathname.startsWith("/account") || req.nextUrl.pathname.startsWith("/admin");
  const hasSession = req.cookies.has("session");

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
