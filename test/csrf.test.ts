import { describe, expect, it, vi } from "vitest";
import {
  allowedOriginsForRequest,
  hasTrustedRequestOrigin,
  requireTrustedRequestOrigin,
} from "@/lib/csrf";

describe("csrf origin checks", () => {
  it("accepts matching Origin header", () => {
    const req = new Request("https://tiny.garden/api/sites", {
      headers: { origin: "https://tiny.garden" },
    });
    expect(hasTrustedRequestOrigin(req)).toBe(true);
    expect(requireTrustedRequestOrigin(req)).toBeNull();
  });

  it("accepts matching Referer origin when Origin is absent", () => {
    const req = new Request("https://tiny.garden/api/sites", {
      headers: { referer: "https://tiny.garden/sites/new" },
    });
    expect(hasTrustedRequestOrigin(req)).toBe(true);
  });

  it("rejects missing Origin and Referer", () => {
    const req = new Request("https://tiny.garden/api/sites");
    const res = requireTrustedRequestOrigin(req);
    expect(res?.status).toBe(403);
  });

  it("rejects mismatched origin", () => {
    const req = new Request("https://tiny.garden/api/sites", {
      headers: { origin: "https://evil.example" },
    });
    const res = requireTrustedRequestOrigin(req);
    expect(res?.status).toBe(403);
  });

  it("includes NEXT_PUBLIC_APP_URL and request origin in allowlist", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.tiny.garden");
    const req = new Request("https://tiny.garden/api/sites", {
      headers: { origin: "https://tiny.garden" },
    });
    const allowed = allowedOriginsForRequest(req);
    expect(allowed.has("https://tiny.garden")).toBe(true);
    expect(allowed.has("https://app.tiny.garden")).toBe(true);
  });
});
