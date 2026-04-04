import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/lib/session", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/lib/vercel", () => ({
  removeDomainFromVercel: vi.fn(),
}));

vi.mock("@/lib/templates-manifest", () => ({
  isKnownTemplateSlug: vi.fn(async () => true),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    site: {
      findUnique: findUniqueMock,
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("site id route auth guards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/sites/[id]/route");
    const req = new Request("https://tiny.garden/api/sites/site123", {
      method: "DELETE",
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when site belongs to another user", async () => {
    getSessionMock.mockResolvedValue({
      userId: "u1",
      arenaToken: "tok",
      arenaUserId: 1,
      arenaUsername: "alice",
    });
    findUniqueMock.mockResolvedValue({
      id: "site123",
      userId: "u2",
      customDomain: null,
    });

    const { DELETE } = await import("@/app/api/sites/[id]/route");
    const req = new Request("https://tiny.garden/api/sites/site123", {
      method: "DELETE",
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(404);
  });
});
