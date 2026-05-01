import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ArenaBlock } from "./arena";
import {
  arenaTextBlockToPlainCss,
  extractChannelStylesCss,
  filterOutChannelStylesBlocks,
  isReservedStylesCssTitle,
  resolveSiteCustomCss,
} from "./channel-styles";

function block(overrides: Partial<ArenaBlock>): ArenaBlock {
  return {
    id: overrides.id ?? 1,
    class: overrides.class ?? "Text",
    type: overrides.type,
    title: overrides.title ?? "Block",
    description: overrides.description ?? null,
    content: overrides.content ?? null,
    content_html: overrides.content_html ?? null,
    image: overrides.image ?? null,
    source: overrides.source ?? null,
    embed: overrides.embed ?? null,
    attachment: overrides.attachment ?? null,
    position: overrides.position ?? 1,
    comment_count: overrides.comment_count ?? 0,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2026-01-01T00:00:00Z",
    width: overrides.width,
    height: overrides.height,
  };
}

describe("channel styles.css extraction", () => {
  it("turns Are.na HTML-ish text content into plain CSS while preserving declarations", () => {
    const css = arenaTextBlockToPlainCss(
      block({
        content_html:
          "<p>:root { --gap: 1rem; }</p><div>.card &amp; .item { color: &quot;red&quot;; }</div><br>.note { content: &#39;ok&#39;; }",
      })
    );

    assert.equal(
      css,
      [
        ":root { --gap: 1rem; }",
        '.card & .item { color: "red"; }',
        ".note { content: 'ok'; }",
      ].join("\n")
    );
  });

  it("recognizes disguised reserved titles and filters those blocks from templates", () => {
    const reservedText = block({ id: 1, title: "\u200bSTYLES.CSS", content: "body {}" });
    const reservedCompat = block({ id: 2, title: "\uff53\uff54\uff59\uff4c\uff45\uff53.css" });
    const visible = block({ id: 3, title: "styles draft" });

    assert.equal(isReservedStylesCssTitle("&nbsp;styles.css&nbsp;"), true);
    assert.equal(isReservedStylesCssTitle(reservedCompat.title), true);
    assert.deepEqual(filterOutChannelStylesBlocks([reservedText, reservedCompat, visible]), [
      visible,
    ]);
  });

  it("uses the first non-empty reserved block CSS and lets saved site CSS take precedence", () => {
    const channelCss = extractChannelStylesCss([
      block({ title: "intro", content: ".intro {}" }),
      block({ title: "styles.css", content: "   " }),
      block({ title: "styles.css", content: { text: "body { color: blue; }" } }),
      block({ title: "styles.css", content: "body { color: red; }" }),
    ]);

    assert.equal(channelCss, "body { color: blue; }");
    assert.equal(resolveSiteCustomCss("  main { display: grid; }  ", channelCss), "main { display: grid; }");
    assert.equal(resolveSiteCustomCss("   ", channelCss), channelCss);
  });
});
