import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  buildTokenPrefix,
  createPlaintextToken,
  hashApiToken,
  parseExpiryDays,
} from "@/lib/api-tokens";

export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    expiresInDays?: number;
  };

  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim()
    : "CLI token";

  const expiresInDays = parseExpiryDays(body.expiresInDays);
  const plaintext = createPlaintextToken();
  const tokenHash = hashApiToken(plaintext);
  const prefix = buildTokenPrefix(plaintext);
  const expiresAt =
    expiresInDays === null
      ? null
      : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const token = await prisma.apiToken.create({
    data: {
      userId: session.userId,
      name,
      tokenHash,
      prefix,
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      token: plaintext,
      details: token,
      warning: "Copy this token now. It will not be shown again.",
    },
    { status: 201 }
  );
}
