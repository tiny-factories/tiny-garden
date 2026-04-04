import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/lib/session", () => ({
  getSession: getSessionMock,
  clearSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    site: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
    },
    subscription: {
      deleteMany: vi.fn(),
    },
    user: {
      delete: vi.fn(),
    },
  },
}));

describe("account delete route csrf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 403 for untrusted origin", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://tiny.garden";
    getSessionMock.mockResolvedValue({
      userId: "u1",
      arenaToken: "tok",
      arenaUserId: 1,
      arenaUsername: "alice",
    });

    const { POST } = await import("@/app/api/account/delete/route");
    const req = new Request("https://tiny.garden/api/account/delete", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });
});
