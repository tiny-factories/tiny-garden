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

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/sites/[id]/build/route");
    const req = new Request("https://tiny.garden/api/sites/site123/build", {
      method: "POST",
    });
    const res = await POST(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(401);
  });
});
