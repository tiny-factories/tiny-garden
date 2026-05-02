import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ArenaBlock } from "./arena";
import {
  channelBlocksForTemplate,
  finderOpenUrl,
  finderThumbContain,
  finderThumbUrl,
} from "./build";

function arenaBlock(overrides: Partial<ArenaBlock>): ArenaBlock {
  return {
    id: overrides.id ?? 1,
    class: Object.hasOwn(overrides, "class") ? overrides.class : "Text",
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

describe("channelBlocksForTemplate", () => {
  it("omits reserved styles.css blocks before public template rendering", () => {
    const blocks = channelBlocksForTemplate([
      arenaBlock({ id: 1, title: "Intro", content: "Hello" }),
      arenaBlock({ id: 2, title: "styles.css", content: "body { color: red; }" }),
    ]);

    assert.deepEqual(
      blocks.map((block) => block.id),
      [1]
    );
    assert.equal(blocks[0]?.content, "Hello");
  });

  it("preserves v3 image dimensions for layout-sensitive templates", () => {
    const [image] = channelBlocksForTemplate([
      arenaBlock({
        id: 3,
        class: undefined,
        type: "image",
        title: "Wide photo",
        image: {
          original: { url: "https://arena.test/original.jpg" },
          large: { url: "https://arena.test/large.jpg" },
          square: { url: "https://arena.test/square.jpg" },
          medium: { url: "https://arena.test/display.jpg" },
          width: null,
          height: null,
        } as ArenaBlock["image"] & { medium: { url: string } },
        width: 1600,
        height: 900,
      }),
    ]);

    assert.equal(image?.type, "image");
    assert.deepEqual(image?.image, {
      original: "https://arena.test/original.jpg",
      large: "https://arena.test/large.jpg",
      square: "https://arena.test/square.jpg",
      display: "https://arena.test/display.jpg",
      width: 1600,
      height: 900,
    });
  });

  it("classifies attachment previews so Finder opens files and contains poster media", () => {
    const [pdf, video] = channelBlocksForTemplate([
      arenaBlock({
        id: 4,
        class: "Attachment",
        title: "Spec sheet",
        image: {
          original: { url: "https://arena.test/spec-poster.jpg" },
          large: { url: "https://arena.test/spec-poster-large.jpg" },
          square: { url: "https://arena.test/spec-poster-square.jpg" },
          display: { url: "https://arena.test/spec-poster-display.jpg" },
        },
        attachment: {
          url: "https://arena.test/spec.pdf",
          file_name: "spec.pdf",
          file_size: 42,
          content_type: "application/pdf",
        },
      }),
      arenaBlock({
        id: 5,
        class: "Attachment",
        title: "Walkthrough",
        image: {
          original: { url: "https://arena.test/video-poster.jpg" },
          large: { url: "https://arena.test/video-poster-large.jpg" },
          square: { url: "https://arena.test/video-poster-square.jpg" },
          display: { url: "https://arena.test/video-poster-display.jpg" },
        },
        attachment: {
          url: "https://arena.test/walkthrough.mov",
          file_name: "walkthrough.mov",
          file_size: 84,
          content_type: "video/quicktime",
        },
      }),
    ]);

    assert.equal(pdf?.attachment?.kind, "pdf");
    assert.equal(pdf?.attachment?.preview_url, "https://arena.test/spec.pdf");
    assert.equal(finderThumbUrl(pdf!), "https://arena.test/spec-poster-large.jpg");
    assert.equal(finderOpenUrl(pdf!), "https://arena.test/spec.pdf");
    assert.equal(finderThumbContain(pdf!), true);

    assert.equal(video?.attachment?.kind, "video");
    assert.equal(video?.attachment?.preview_video_url, "https://arena.test/walkthrough.mov");
    assert.equal(finderThumbUrl(video!), "https://arena.test/video-poster-large.jpg");
    assert.equal(finderOpenUrl(video!), "https://arena.test/walkthrough.mov");
    assert.equal(finderThumbContain(video!), true);
  });
});
