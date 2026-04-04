import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import {
  featureBandIndexForCents,
  isAllowedSubscriptionAmount,
  isPricingPlanId,
  legacyTierIdToAmountCents,
  normalizePaidAmountCents,
  PWYC_MAX_CENTS,
  PWYC_MIN_PAID_CENTS,
} from "@/lib/pricing-tiers";
import { requireTrustedRequestOrigin } from "@/lib/csrf";

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

export async function POST(req: NextRequest) {
  const csrfError = requireTrustedRequestOrigin(req);
  if (csrfError) return csrfError;

  const stripe = getStripe();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
  });

  let amountCents: number | undefined;
  let pricingPlanLabel: string | undefined;
  const raw = await req.text();
  if (raw) {
    try {
      const j = JSON.parse(raw) as {
        amountCents?: unknown;
        tierId?: unknown;
        pricingPlan?: unknown;
      };
      if (typeof j.amountCents === "number" && Number.isFinite(j.amountCents)) {
        amountCents = Math.round(j.amountCents);
      } else if (typeof j.tierId === "string") {
        const legacy = legacyTierIdToAmountCents(j.tierId);
        if (legacy !== undefined) {
          amountCents = legacy;
        }
      }
      if (typeof j.pricingPlan === "string" && isPricingPlanId(j.pricingPlan)) {
        pricingPlanLabel = j.pricingPlan;
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  const paidCents =
    amountCents !== undefined && amountCents >= PWYC_MIN_PAID_CENTS
      ? normalizePaidAmountCents(amountCents)
      : undefined;

  const legacyPriceId = process.env.STRIPE_SUPPORTER_PRICE_ID;

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

  const origin = appOrigin();

  let line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
  let mode: Stripe.Checkout.SessionCreateParams["mode"];
  let subscription_data: Stripe.Checkout.SessionCreateParams["subscription_data"];

  if (
    paidCents !== undefined &&
    isAllowedSubscriptionAmount(paidCents) &&
    paidCents <= PWYC_MAX_CENTS
  ) {
    const band = featureBandIndexForCents(paidCents);
    const planBit = pricingPlanLabel ? ` · ${pricingPlanLabel}` : "";
    mode = "subscription";
    line_items = [
      {
        price_data: {
          currency: "usd",
          unit_amount: paidCents,
          recurring: { interval: "month" },
          product_data: {
            name: `tiny.garden membership${planBit}`,
            description: `Monthly · $${paidCents / 100}/mo · band ${band}`,
          },
        },
        quantity: 1,
      },
    ];
    subscription_data = {
      metadata: {
        userId: user.id,
        pwycCents: String(paidCents),
        pwycBand: String(band),
        ...(pricingPlanLabel ? { pricingPlan: pricingPlanLabel } : {}),
      },
    };
  } else if (legacyPriceId) {
    mode = "payment";
    line_items = [{ price: legacyPriceId, quantity: 1 }];
    subscription_data = undefined;
  } else {
    return NextResponse.json(
      {
        error:
          "Billing is not configured. Set STRIPE_SUPPORTER_PRICE_ID or use a preset monthly amount.",
      },
      { status: 503 }
    );
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items,
    success_url: `${origin}/sites?upgraded=true`,
    cancel_url: `${origin}/sites`,
    subscription_data,
    metadata: {
      userId: user.id,
      ...(paidCents !== undefined && isAllowedSubscriptionAmount(paidCents)
        ? {
            pwycCents: String(paidCents),
            pwycBand: String(featureBandIndexForCents(paidCents)),
            ...(pricingPlanLabel ? { pricingPlan: pricingPlanLabel } : {}),
          }
        : {}),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
