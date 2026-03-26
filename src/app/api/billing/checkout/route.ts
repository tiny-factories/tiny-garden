import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

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

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      { price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/sites?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/sites`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
