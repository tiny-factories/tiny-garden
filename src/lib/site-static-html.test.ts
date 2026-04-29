import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  blobUrlForSiblingSiteFile,
  filenameFromServePath,
  filenameFromVisitorPath,
} from "./site-static-html";

describe("site static HTML filename resolution", () => {
  it("resolves public visitor paths that middleware forwards after rewrites", () => {
    assert.equal(filenameFromVisitorPath("/"), "index.html");
    assert.equal(filenameFromVisitorPath("/block-17.html"), "block-17.html");
    assert.equal(filenameFromVisitorPath("block-23.html"), "block-23.html");
  });

  it("rejects visitor paths outside the generated HTML allowlist", () => {
    assert.equal(filenameFromVisitorPath("/styles.css"), null);
    assert.equal(filenameFromVisitorPath("/../index.html"), null);
    assert.equal(filenameFromVisitorPath("/nested/block-17.html"), null);
    assert.equal(filenameFromVisitorPath("/block-17.json"), null);
  });

  it("resolves safe filenames from direct serve API paths", () => {
    assert.equal(filenameFromServePath("/api/serve/site", "/api/serve/site"), "index.html");
    assert.equal(
      filenameFromServePath("/api/serve/site/block-17.html", "/api/serve/site"),
      "block-17.html"
    );
    assert.equal(
      filenameFromServePath("/api/serve/site/styles.css", "/api/serve/site"),
      null
    );
    assert.equal(filenameFromServePath("/other/site/block-17.html", "/api/serve/site"), null);
  });

  it("builds sibling blob URLs for directory template child pages", () => {
    assert.equal(
      blobUrlForSiblingSiteFile(
        "https://blob.vercel-storage.com/sites/site/index.html",
        "block-17.html"
      ),
      "https://blob.vercel-storage.com/sites/site/block-17.html"
    );
  });
});
