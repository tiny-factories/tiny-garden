import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeSiteSubdomain } from "./subdomain";

describe("normalizeSiteSubdomain", () => {
  it("normalizes DNS-safe site subdomains", () => {
    assert.equal(normalizeSiteSubdomain(" My-Site-42 "), "my-site-42");
    assert.equal(normalizeSiteSubdomain("a"), "a");
  });

  it("rejects values that can escape host labels or generated site paths", () => {
    assert.equal(normalizeSiteSubdomain("../victim"), null);
    assert.equal(normalizeSiteSubdomain("nested/path"), null);
    assert.equal(normalizeSiteSubdomain("site.example.com"), null);
    assert.equal(normalizeSiteSubdomain("-site"), null);
    assert.equal(normalizeSiteSubdomain("site-"), null);
    assert.equal(normalizeSiteSubdomain("www"), null);
  });
});
