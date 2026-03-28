import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Stripe may require a separate “thin” event destination alongside snapshot webhooks.
 * Real billing logic lives in /api/billing/webhook (snapshot). This route only verifies
 * the thin signing secret and acknowledges — avoids duplicate DB updates.
 */
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_THIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_THIN_SECRET not configured" },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
