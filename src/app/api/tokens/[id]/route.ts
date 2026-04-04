import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth?.userId) {
    return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const token = await prisma.apiToken.findUnique({
    where: { id },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!token || token.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  }

  if (!token.revokedAt) {
    await prisma.apiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
