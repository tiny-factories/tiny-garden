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
    process.env.NEXT_PUBLIC_APP_URL = "https://tiny.garden";
  });

  it("returns 403 when request origin is missing", async () => {
    getSessionMock.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/sites/[id]/route");
    const req = new Request("https://tiny.garden/api/sites/site123", {
      method: "DELETE",
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when request origin is missing before auth checks", async () => {
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
    expect(res.status).toBe(403);
  });

  it("returns 403 for untrusted origin on DELETE", async () => {
    getSessionMock.mockResolvedValue({
      userId: "u1",
      arenaToken: "tok",
      arenaUserId: 1,
      arenaUsername: "alice",
    });
    const { DELETE } = await import("@/app/api/sites/[id]/route");
    const req = new Request("https://tiny.garden/api/sites/site123", {
      method: "DELETE",
      headers: {
        origin: "https://evil.example",
      },
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(403);
  });

  it("allows trusted origin on DELETE and then evaluates auth", async () => {
    getSessionMock.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/sites/[id]/route");
    const req = new Request("https://tiny.garden/api/sites/site123", {
      method: "DELETE",
      headers: {
        origin: "https://tiny.garden",
      },
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "site123" }),
    });
    expect(res.status).toBe(401);
  });
});
