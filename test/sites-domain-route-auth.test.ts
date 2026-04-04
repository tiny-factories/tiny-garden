import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/lib/session", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/lib/vercel", () => ({
  addDomainToVercel: vi.fn(),
  removeDomainFromVercel: vi.fn(),
  getProjectDomain: vi.fn(),
  getDomainConfig: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    site: {
      findUnique: findUniqueMock,
      update: vi.fn(),
    },
  },
}));

describe("site domain route auth guards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/sites/[id]/domain/route");
    const req = new Request("https://tiny.garden/api/sites/site123/domain");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET returns 404 when site belongs to another user", async () => {
    getSessionMock.mockResolvedValue({
      userId: "u1",
      arenaToken: "tok",
      arenaUserId: 1,
      arenaUsername: "alice",
    });
    findUniqueMock.mockResolvedValue({
      id: "site123",
      userId: "u2",
      user: { isAdmin: false, isFriend: false, subscription: { plan: "pro" } },
    });

    const { GET } = await import("@/app/api/sites/[id]/domain/route");
    const req = new Request("https://tiny.garden/api/sites/site123/domain");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(404);
  });
});
