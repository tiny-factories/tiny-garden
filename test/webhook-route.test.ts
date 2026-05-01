import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const constructEventMock = vi.fn();
function StripeMock() {
  return {
    webhooks: {
      constructEvent: constructEventMock,
    },
  };
}

vi.mock("stripe", () => ({
  default: StripeMock,
}));

describe("billing webhook route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test";
  });

  it("returns 503 when webhook secret is missing", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route");
    const req = {
      text: vi.fn().mockResolvedValue("{}"),
      headers: new Headers({ "stripe-signature": "sig" }),
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(503);
  });

  it("returns 400 when signature is missing", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const { POST } = await import("@/app/api/billing/webhook/route");
    const req = {
      text: vi.fn().mockResolvedValue("{}"),
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid signature", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    constructEventMock.mockImplementationOnce(() => {
      throw new Error("bad sig");
    });

    const { POST } = await import("@/app/api/billing/webhook/route");
    const req = {
      text: vi.fn().mockResolvedValue("{}"),
      headers: new Headers({ "stripe-signature": "sig" }),
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(constructEventMock).toHaveBeenCalledWith(
      "{}",
      "sig",
      "whsec_test"
    );
  });
});
