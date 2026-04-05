import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "@/app/api/auth/login/route";

describe("GET /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 when oauth env is missing", async () => {
    process.env.ARENA_CLIENT_ID = "";
    process.env.ARENA_REDIRECT_URI = "";
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("adds oauth state and redirects", async () => {
    process.env.ARENA_CLIENT_ID = "client-id";
    process.env.ARENA_REDIRECT_URI = "https://tiny.garden/api/auth/callback";

    const res = await GET();
    expect(res.status).toBe(307);

    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    const redirect = new URL(location!);
    expect(redirect.origin).toBe("https://www.are.na");
    expect(redirect.pathname).toBe("/oauth/authorize");
    expect(redirect.searchParams.get("state")).toMatch(/^[a-f0-9]{48}$/);
    expect(res.headers.get("set-cookie")).toContain("arena_oauth_state=");
  });
});
