import { NextResponse } from "next/server";
import { BUTTONDOWN_WAITLIST_TAG } from "@/lib/buttondown-waitlist";

/**
 * Proxies Buttondown embed-subscribe from the server so:
 * - No browser CORS issues / false "network error" on success
 * - 302 redirects from Buttondown are treated as success (fetch default makes res.ok false)
 * - Tag is always sent as application/x-www-form-urlencoded `tag`
 */
export async function POST(req: Request) {
  const publication = process.env.NEXT_PUBLIC_BUTTONDOWN_USER?.trim();
  if (!publication) {
    return NextResponse.json(
      { ok: false, error: "Waitlist isn’t configured (NEXT_PUBLIC_BUTTONDOWN_USER)." },
      { status: 503 }
    );
  }

  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const upstream = new URLSearchParams();
  upstream.set("email", email);
  upstream.append("tag", BUTTONDOWN_WAITLIST_TAG);

  const url = `https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(publication)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: upstream.toString(),
      redirect: "manual",
    });

    if (res.ok || res.status === 302 || res.status === 301 || res.status === 303) {
      return NextResponse.json({ ok: true });
    }

    const text = await res.text();
    return NextResponse.json(
      {
        ok: false,
        error: text.replace(/\s+/g, " ").trim().slice(0, 240) || `Subscribe failed (${res.status}).`,
      },
      { status: 502 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach Buttondown." }, { status: 502 });
  }
}
