import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/logout/route";

describe("auth logout csrf guard", () => {
  it("returns 403 when request origin is untrusted", async () => {
    const req = new NextRequest("https://tiny.garden/api/auth/logout", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
