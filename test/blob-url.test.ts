import { describe, expect, it } from "vitest";
import { validateBlobUrl } from "@/lib/blob-url";

describe("validateBlobUrl", () => {
  it("accepts exact blob host", () => {
    const parsed = validateBlobUrl("https://blob.vercel-storage.com/path/file.png");
    expect(parsed?.hostname).toBe("blob.vercel-storage.com");
  });

  it("accepts allowed public blob suffix hosts", () => {
    const parsed = validateBlobUrl(
      "https://abc123.public.blob.vercel-storage.com/path/file.png"
    );
    expect(parsed?.hostname).toBe("abc123.public.blob.vercel-storage.com");
  });

  it("rejects host confusion via includes bypass", () => {
    const parsed = validateBlobUrl(
      "https://blob.vercel-storage.com.evil.example/path/file.png"
    );
    expect(parsed).toBeNull();
  });

  it("rejects non-https protocols", () => {
    const parsed = validateBlobUrl("http://blob.vercel-storage.com/path/file.png");
    expect(parsed).toBeNull();
  });

  it("rejects credentialed URLs", () => {
    const parsed = validateBlobUrl(
      "https://user:pass@blob.vercel-storage.com/path/file.png"
    );
    expect(parsed).toBeNull();
  });

  it("rejects malformed URLs", () => {
    const parsed = validateBlobUrl("://not-a-url");
    expect(parsed).toBeNull();
  });
});
