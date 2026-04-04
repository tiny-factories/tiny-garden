import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/lib/session", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    site: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/build", () => ({
  buildSite: vi.fn(),
}));

describe("site build route auth guard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 403 when origin is not trusted", async () => {
    const { POST } = await import("@/app/api/sites/[id]/build/route");
    const req = new Request("https://tiny.garden/api/sites/site123/build", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/sites/[id]/build/route");
    const req = new Request("https://tiny.garden/api/sites/site123/build", {
      method: "POST",
      headers: { origin: "https://tiny.garden" },
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(401);
  });
});
