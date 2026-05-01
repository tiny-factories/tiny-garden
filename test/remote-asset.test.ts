import { describe, expect, it, vi } from "vitest";
import { fetchRemoteAsset } from "@/lib/remote-asset";

function makeReadableStreamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

describe("fetchRemoteAsset", () => {
  it("rejects non-https urls", async () => {
    await expect(fetchRemoteAsset("http://example.com/a.png")).rejects.toThrow(
      "Blocked asset URL"
    );
  });

  it("rejects localhost/private hosts", async () => {
    await expect(fetchRemoteAsset("https://localhost/a.png")).rejects.toThrow(
      "Blocked asset URL"
    );
    await expect(fetchRemoteAsset("https://127.0.0.1/a.png")).rejects.toThrow(
      "Blocked asset URL"
    );
    await expect(fetchRemoteAsset("https://10.0.0.12/a.png")).rejects.toThrow(
      "Blocked asset URL"
    );
    await expect(
      fetchRemoteAsset("https://192.168.1.15/a.png")
    ).rejects.toThrow("Blocked asset URL");
    await expect(fetchRemoteAsset("https://172.20.1.9/a.png")).rejects.toThrow(
      "Blocked asset URL"
    );
  });

  it("keeps content-type from upstream response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchRemoteAsset("https://example.com/meta.json");
    expect(res).not.toBeNull();
    expect(res.contentType).toBe("application/json");
    expect(res.buffer.length).toBeGreaterThan(0);
  });

  it("rejects oversized responses via content-length", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("x", {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(6_000_000),
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchRemoteAsset("https://example.com/large.png", {
        maxBytes: 5_000_000,
      })
    ).rejects.toThrow("Asset exceeds max size");
  });

  it("rejects oversized streamed responses", async () => {
    const stream = makeReadableStreamFromChunks([
      new Uint8Array(3_000_000),
      new Uint8Array(3_000_000),
    ]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      fetchRemoteAsset("https://example.com/stream.jpg", {
        maxBytes: 5_000_000,
      })
    ).rejects.toThrow("Asset exceeds max size");
  });

  it("returns buffer and content type for valid responses", async () => {
    const body = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { "content-type": "image/webp" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchRemoteAsset("https://cdn.example.com/photo.webp");
    expect(res).not.toBeNull();
    expect(res?.contentType).toBe("image/webp");
    expect(res?.buffer.length).toBe(4);
  });
});
