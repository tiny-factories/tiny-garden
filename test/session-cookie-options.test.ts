import { describe, it, expect } from "vitest";
import { sessionCookieOptions } from "@/lib/session";

describe("session cookie options", () => {
  it("marks cookie secure in production", () => {
    const opts = sessionCookieOptions("production");
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.secure).toBe(true);
  });

  it("does not require secure cookie in development", () => {
    const opts = sessionCookieOptions("development");
    expect(opts.secure).toBe(false);
  });
});
