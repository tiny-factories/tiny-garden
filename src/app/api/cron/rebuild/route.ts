import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ArenaClient } from "@/lib/arena";
import { buildSite } from "@/lib/build";

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only auto-rebuild for Pro and Studio plans (free = manual only)
  const sites = await prisma.site.findMany({
    where: {
      published: true,
      user: {
        OR: [
          { isAdmin: true },
          { isFriend: true },
          { subscription: { plan: { in: ["pro", "studio"] } } },
        ],
      },
    },
    include: { user: { include: { subscription: true } } },
  });

  let rebuilt = 0;
  let skipped = 0;
  let failed = 0;

  for (const site of sites) {
    try {
      const client = new ArenaClient(site.user.arenaToken);
      const channel = await client.getChannel(site.channelSlug);

      // Only rebuild if channel was updated after last build
      const channelUpdated = new Date(channel.updated_at);
      if (site.lastBuiltAt && channelUpdated <= site.lastBuiltAt) {
        skipped++;
        continue;
      }

      await buildSite(site.id);

      // Pause between site rebuilds to respect rate limits
      await new Promise((r) => setTimeout(r, 1000));
      rebuilt++;
    } catch (error) {
      console.error(`Cron rebuild failed for ${site.subdomain}:`, error);
      failed++;
    }
  }

  return NextResponse.json({ rebuilt, skipped, failed, total: sites.length });
}
