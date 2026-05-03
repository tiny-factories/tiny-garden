import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { responseBufferWithinLimit } from "./build";

describe("build asset buffering", () => {
  it("skips responses whose declared content-length is over the mirror cap", async () => {
    const response = new Response("small body", {
      headers: { "content-length": "11" },
    });

    assert.equal(await responseBufferWithinLimit(response, 10), null);
  });

  it("stops streaming once an undeclared response grows past the mirror cap", async () => {
    let cancelled = false;
    let pulls = 0;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          pulls++;
          controller.enqueue(new Uint8Array(6));
          if (pulls > 2) controller.close();
        },
        cancel() {
          cancelled = true;
        },
      })
    );

    assert.equal(await responseBufferWithinLimit(response, 10), null);
    assert.equal(cancelled, true);
  });

  it("returns a buffer for responses within the mirror cap", async () => {
    const response = new Response("tiny");

    const buffer = await responseBufferWithinLimit(response, 10);

    assert.ok(buffer);
    assert.equal(buffer.toString("utf8"), "tiny");
  });
});
