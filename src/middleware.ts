import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";

  // Check if this is a subdomain request
  if (host.endsWith(`.${siteDomain}`) && host !== siteDomain && host !== `www.${siteDomain}`) {
    const subdomain = host.replace(`.${siteDomain}`, "");

    // Rewrite to the generated site serving route
    return NextResponse.rewrite(
      new URL(`/api/serve/${subdomain}${req.nextUrl.pathname}`, req.url)
    );
  }

  // Protect dashboard routes
  const isProtected = req.nextUrl.pathname.startsWith("/sites") || req.nextUrl.pathname.startsWith("/site") || req.nextUrl.pathname.startsWith("/account");
  const hasSession = req.cookies.has("session");

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
