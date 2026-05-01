import { NextResponse } from "next/server";

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin.toLowerCase();
  } catch {
    if (/^https?:\/\//i.test(trimmed)) return null;
    try {
      return new URL(`https://${trimmed}`).origin.toLowerCase();
    } catch {
      return null;
    }
  }
}

function requestUrlOrigin(req: Request): string | null {
  try {
    return new URL(req.url).origin.toLowerCase();
  } catch {
    return null;
  }
}

function initiatedOrigin(req: Request): string | null {
  const originHeader = normalizeOrigin(req.headers.get("origin"));
  if (originHeader) return originHeader;

  const referer = req.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function allowedOriginsForRequest(req: Request): Set<string> {
  const allowed = new Set<string>();

  const requestOrigin = requestUrlOrigin(req);
  if (requestOrigin) allowed.add(requestOrigin);

  const appOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (appOrigin) allowed.add(appOrigin);

  const vercelOrigin = normalizeOrigin(process.env.VERCEL_URL);
  if (vercelOrigin) allowed.add(vercelOrigin);

  return allowed;
}

export function hasTrustedRequestOrigin(req: Request): boolean {
  const origin = initiatedOrigin(req);
  if (!origin) return false;
  return allowedOriginsForRequest(req).has(origin);
}

export function requireTrustedRequestOrigin(req: Request): NextResponse | null {
  if (hasTrustedRequestOrigin(req)) return null;
  return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
}
