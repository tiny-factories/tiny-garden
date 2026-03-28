import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

/** Stripe requires absolute URLs with a scheme; env is often set as `tiny.garden` by mistake. */
function appOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (raw) {
    const base = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return base.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST() {
  const stripe = getStripe();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
  });

  // Create or retrieve Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { userId: user.id, arenaUsername: user.arenaUsername },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const supporterPriceId = process.env.STRIPE_SUPPORTER_PRICE_ID;
  if (!supporterPriceId) {
    return NextResponse.json(
      { error: "Billing is not configured (STRIPE_SUPPORTER_PRICE_ID)" },
      { status: 503 }
    );
  }

  const origin = appOrigin();
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: supporterPriceId, quantity: 1 }],
    success_url: `${origin}/sites?upgraded=true`,
    cancel_url: `${origin}/sites`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
