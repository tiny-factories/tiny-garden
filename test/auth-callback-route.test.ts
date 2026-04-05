import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const verifyOAuthStateMock = vi.fn();
const setSessionMock = vi.fn();
const findUniqueMock = vi.fn();
const upsertMock = vi.fn();
const getBetaAccessCountMock = vi.fn();

vi.mock("@/lib/oauth-state", () => ({
  OAUTH_STATE_COOKIE_NAME: "arena_oauth_state",
  verifyOAuthState: verifyOAuthStateMock,
}));

vi.mock("@/lib/session", () => ({
  setSession: setSessionMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));

vi.mock("@/lib/beta", () => ({
  BETA_SPOTS: 100,
  getBetaAccessCount: getBetaAccessCountMock,
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.ARENA_CLIENT_ID = "arena-client";
    process.env.ARENA_CLIENT_SECRET = "arena-secret";
    process.env.ARENA_REDIRECT_URI = "https://tiny.garden/api/auth/callback";
  });

  it("rejects callback when state is missing", async () => {
    verifyOAuthStateMock.mockReturnValue(false);

    const { GET } = await import("@/app/api/auth/callback/route");
    const request = new NextRequest(
      "https://tiny.garden/api/auth/callback?code=abc123"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=invalid_state");
    expect(verifyOAuthStateMock).toHaveBeenCalledWith(undefined, null);
  });

  it("rejects callback when state does not match", async () => {
    verifyOAuthStateMock.mockReturnValue(false);

    const { GET } = await import("@/app/api/auth/callback/route");
    const request = new NextRequest(
      "https://tiny.garden/api/auth/callback?code=abc123&state=wrong-state"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=invalid_state");
    expect(verifyOAuthStateMock).toHaveBeenCalledWith(undefined, "wrong-state");
  });

  it("accepts callback when state matches and sets session", async () => {
    verifyOAuthStateMock.mockReturnValue(true);
    findUniqueMock.mockResolvedValue(null);
    upsertMock.mockResolvedValue({
      id: "user-1",
    });
    getBetaAccessCountMock.mockResolvedValue(0);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          slug: "alice",
          avatar_image: { display: "https://example.com/avatar.png" },
        }),
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { GET } = await import("@/app/api/auth/callback/route");
    const request = new NextRequest("https://tiny.garden/api/auth/callback?code=abc123&state=expected-state", {
      headers: {
        cookie: "arena_oauth_state=encrypted-state-value",
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sites?signed_in=1");
    expect(setSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      arenaToken: "token-1",
      arenaUserId: 1,
      arenaUsername: "alice",
    });
    expect(verifyOAuthStateMock).toHaveBeenCalledWith(
      "encrypted-state-value",
      "expected-state"
    );
  });
});
