import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAllowedBlobAssetUrl } from "./blob-asset-proxy";

describe("blob asset proxy URL allowlist", () => {
  it("allows Vercel Blob HTTPS hosts", () => {
    assert.equal(
      isAllowedBlobAssetUrl("https://blob.vercel-storage.com/sites/site/image.png"),
      true
    );
    assert.equal(
      isAllowedBlobAssetUrl("https://store-id.public.blob.vercel-storage.com/site/image.png"),
      true
    );
  });

  it("rejects substring bypasses and non-HTTPS URLs", () => {
    assert.equal(
      isAllowedBlobAssetUrl("https://attacker.example/leak?next=blob.vercel-storage.com"),
      false
    );
    assert.equal(
      isAllowedBlobAssetUrl("https://blob.vercel-storage.com.attacker.example/image.png"),
      false
    );
    assert.equal(
      isAllowedBlobAssetUrl("http://blob.vercel-storage.com/sites/site/image.png"),
      false
    );
  });
});
