import { describe, expect, it } from "vitest";
import {
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_TTL_SECONDS,
  createOAuthState,
  createOAuthStateCookieValue,
  oauthStateCookieOptions,
  verifyOAuthState,
} from "@/lib/oauth-state";

describe("oauth-state", () => {
  it("generates non-empty random state", () => {
    const state = createOAuthState();
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(20);
  });

  it("verifies valid state cookie payload", () => {
    const state = "state-token-123";
    const cookieValue = createOAuthStateCookieValue(state);
    expect(verifyOAuthState(cookieValue, state)).toBe(true);
  });

  it("rejects mismatched returned state", () => {
    const cookieValue = createOAuthStateCookieValue("expected");
    expect(verifyOAuthState(cookieValue, "different")).toBe(false);
  });

  it("rejects invalid cookie payload", () => {
    expect(verifyOAuthState("garbage", "expected")).toBe(false);
  });

  it("exposes consistent cookie options", () => {
    const opts = oauthStateCookieOptions("production");
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.maxAge).toBe(OAUTH_STATE_TTL_SECONDS);
    expect(opts.path).toBe("/");
    expect(OAUTH_STATE_COOKIE_NAME).toBe("arena_oauth_state");
  });
});
