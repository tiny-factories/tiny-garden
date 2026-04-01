import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { removeDomainFromVercel } from "@/lib/vercel";
import { sendUmamiServerEvent } from "@/lib/umami-server";

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
        let activated = false;
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
          activated = true;
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
          activated = true;
        }
        if (activated) {
          await sendUmamiServerEvent("subscription-activated", {
            mode: session.mode === "payment" ? "payment" : "subscription",
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

      // Remove custom domains from all user's sites on downgrade
      const sitesWithDomains = await prisma.site.findMany({
        where: { userId: user.id, customDomain: { not: null } },
      });
      for (const site of sitesWithDomains) {
        if (site.customDomain) {
          await removeDomainFromVercel(site.customDomain).catch(() => {});
        }
      }
      if (sitesWithDomains.length > 0) {
        await prisma.site.updateMany({
          where: { userId: user.id, customDomain: { not: null } },
          data: { customDomain: null, domainVerified: false },
        });
      }
      await sendUmamiServerEvent("subscription-canceled");
    }
  }

  return NextResponse.json({ received: true });
}
