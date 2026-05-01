import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getSessionMock = vi.fn();

vi.mock("@/lib/session", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    site: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

describe("admin feature route csrf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://tiny.garden";
  });

  it("POST returns 403 when request origin is not trusted", async () => {
    getSessionMock.mockResolvedValue({
      userId: "u1",
      arenaToken: "tok",
      arenaUserId: 1,
      arenaUsername: "alice",
    });
    const { POST } = await import("@/app/api/admin/feature/route");
    const req = new NextRequest("https://tiny.garden/api/admin/feature", {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify({ siteId: "s1", featured: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
