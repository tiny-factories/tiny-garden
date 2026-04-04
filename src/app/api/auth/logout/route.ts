import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { requireTrustedRequestOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  const csrfError = requireTrustedRequestOrigin(req);
  if (csrfError) return csrfError;

  await clearSession();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
