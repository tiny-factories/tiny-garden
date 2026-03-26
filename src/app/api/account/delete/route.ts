import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete all generated site files
  const sites = await prisma.site.findMany({
    where: { userId: session.userId },
    select: { subdomain: true },
  });

  for (const site of sites) {
    const dir = path.join(process.cwd(), "generated", site.subdomain);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }

  // Delete all user data (cascade: sites, subscription)
  await prisma.site.deleteMany({ where: { userId: session.userId } });
  await prisma.subscription.deleteMany({ where: { userId: session.userId } });
  await prisma.user.delete({ where: { id: session.userId } });

  await clearSession();

  return NextResponse.json({ success: true });
}
