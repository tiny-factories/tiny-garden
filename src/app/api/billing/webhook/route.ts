import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string | null;
    if (customerId) {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (user) {
        if (session.mode === "payment") {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            update: {
              plan: "pro",
              stripeSubscriptionId: null,
              status: "active",
            },
            create: {
              userId: user.id,
              plan: "pro",
              stripeSubscriptionId: null,
              status: "active",
            },
          });
        } else if (session.mode === "subscription" && session.subscription) {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            update: {
              plan: "pro",
              stripeSubscriptionId: session.subscription as string,
              status: "active",
            },
            create: {
              userId: user.id,
              plan: "pro",
              stripeSubscriptionId: session.subscription as string,
              status: "active",
            },
          });
        }
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (user) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { plan: "free", status: "canceled" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
