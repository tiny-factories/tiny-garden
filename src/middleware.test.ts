import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRequire } from "node:module";
import { NextRequest } from "next/server";

const require = createRequire(import.meta.url);
const { middleware } = require("../src/middleware.ts") as typeof import("./middleware");

describe("middleware static site rewrites", () => {
  it("forwards the public visitor path for wildcard subdomains", () => {
    const req = new NextRequest("https://channel.tiny.garden/block-17.html", {
      headers: { host: "channel.tiny.garden" },
    });

    const res = middleware(req);

    assert.equal(
      res.headers.get("x-middleware-rewrite"),
      "https://channel.tiny.garden/api/serve/channel/block-17.html"
    );
    assert.equal(
      res.headers.get("x-middleware-request-x-tiny-garden-site-path"),
      "/block-17.html"
    );
  });

  it("forwards the public visitor path for custom domains", () => {
    const req = new NextRequest("https://example.com/block-42.html", {
      headers: { host: "example.com" },
    });

    const res = middleware(req);

    assert.equal(
      res.headers.get("x-middleware-rewrite"),
      "https://example.com/api/serve/_custom/example.com/block-42.html"
    );
    assert.equal(
      res.headers.get("x-middleware-request-x-tiny-garden-site-path"),
      "/block-42.html"
    );
  });
});
