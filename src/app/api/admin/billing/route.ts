import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user?.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    const stripe = getStripe();

    // Get all subscriptions
    const subscriptions = await stripe.subscriptions.list({ limit: 100 });

    let activeCount = 0;
    let canceledCount = 0;
    let pastDueCount = 0;
    let mrr = 0;

    for (const sub of subscriptions.data) {
      if (sub.status === "active" || sub.status === "trialing") {
        activeCount++;
        // Calculate MRR from subscription items
        for (const item of sub.items.data) {
          const amount = item.price?.unit_amount || 0;
          const interval = item.price?.recurring?.interval;
          if (interval === "month") {
            mrr += amount;
          } else if (interval === "year") {
            mrr += Math.round(amount / 12);
          }
        }
      } else if (sub.status === "canceled") {
        canceledCount++;
      } else if (sub.status === "past_due") {
        pastDueCount++;
      }
    }

    // Get recent charges for revenue chart (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const charges = await stripe.charges.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    // Group charges by day
    const dailyRevenue: Record<string, number> = {};
    for (const charge of charges.data) {
      if (charge.status === "succeeded" && !charge.refunded) {
        const date = new Date(charge.created * 1000).toISOString().slice(0, 10);
        dailyRevenue[date] = (dailyRevenue[date] || 0) + charge.amount;
      }
    }

    // Fill in missing days
    const revenueTimeline: { date: string; amount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      revenueTimeline.push({ date: key, amount: dailyRevenue[key] || 0 });
    }

    // Get recent one-time payments (supporters)
    const payments = await stripe.paymentIntents.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    let oneTimeRevenue = 0;
    for (const pi of payments.data) {
      if (pi.status === "succeeded") {
        oneTimeRevenue += pi.amount;
      }
    }

    return NextResponse.json({
      subscriptions: {
        active: activeCount,
        canceled: canceledCount,
        pastDue: pastDueCount,
        total: subscriptions.data.length,
      },
      mrr: mrr / 100, // Convert cents to dollars
      totalRevenue30d: (Object.values(dailyRevenue).reduce((a, b) => a + b, 0) + oneTimeRevenue) / 100,
      revenueTimeline: revenueTimeline.map((d) => ({
        date: d.date,
        amount: d.amount / 100,
      })),
    });
  } catch (error) {
    console.error("Stripe admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch billing data" }, { status: 500 });
  }
}
