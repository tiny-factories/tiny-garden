import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { validateMock, fetchMock } = vi.hoisted(() => {
  return {
    validateMock: vi.fn(),
    fetchMock: vi.fn(),
  };
});

vi.mock("@/lib/blob-url", () => ({
  validateBlobUrl: validateMock,
}));

function requestWithUrl(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/asset", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    vi.stubGlobal("fetch", fetchMock);
  });

  it("returns 400 when url param missing", async () => {
    const mod = await import("@/app/api/asset/route");
    const req = requestWithUrl("http://localhost/api/asset");
    const res = await mod.GET(req);

    expect(res.status).toBe(400);
  });

  it("returns 403 when token missing", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const mod = await import("@/app/api/asset/route");
    const req = requestWithUrl("http://localhost/api/asset?url=https://blob.vercel-storage.com/a");
    const res = await mod.GET(req);

    expect(res.status).toBe(403);
  });

  it("returns 403 for invalid blob url", async () => {
    validateMock.mockReturnValueOnce(null);
    const mod = await import("@/app/api/asset/route");
    const req = requestWithUrl("http://localhost/api/asset?url=https://evil.com/x");
    const res = await mod.GET(req);

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards to blob url with auth header", async () => {
    validateMock.mockReturnValueOnce(new URL("https://blob.vercel-storage.com/path/file.png"));
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/png" },
      })
    );

    const mod = await import("@/app/api/asset/route");
    const req = requestWithUrl(
      "http://localhost/api/asset?url=https://blob.vercel-storage.com/path/file.png"
    );
    const res = await mod.GET(req);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://blob.vercel-storage.com/path/file.png",
      { headers: { Authorization: "Bearer blob-token" } }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });
});
