import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SiteData, TemplateBlock } from "./build";
import {
  enrichFeatureRequestSiteData,
  featureRequestPrimaryTitle,
  orderedBracketTokensFromBlock,
  slugifyBracketLabel,
} from "./feature-request-tags";
import {
  featureRequestCleanDescription,
  featureRequestRowExcerpt,
  parseFeatureRequestStatus,
} from "./feature-request-status";

function block(overrides: Partial<TemplateBlock>): TemplateBlock {
  return {
    id: overrides.id ?? 1,
    type: overrides.type ?? "text",
    title: overrides.title ?? "",
    description: overrides.description ?? "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    position: overrides.position ?? 1,
    content: overrides.content,
    link: overrides.link,
    attachment: overrides.attachment,
    source_url: null,
    comment_count: overrides.comment_count ?? 0,
    arena_url: "https://are.na/block/1",
  };
}

function siteData(blocks: TemplateBlock[], template = "feature-requests"): SiteData {
  return {
    channel: {
      title: "Roadmap",
      slug: "roadmap",
      description: "[design] [research]",
      user: { name: "Tiny", slug: "tiny", avatar_url: "" },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      length: blocks.length,
    },
    blocks,
    site: {
      subdomain: "roadmap",
      url: "https://roadmap.tiny.garden",
      template,
      custom_css: "",
      built_at: "2026-01-01T00:00:00Z",
    },
  };
}

describe("feature request status parsing", () => {
  it("prefers explicit bracket status over legacy lines and comment-count fallback", () => {
    const parsed = parseFeatureRequestStatus(
      block({
        title: "[design] Add better filters",
        description: "Status: shipped",
        content: "<p>[status: in progress] Keep current sprint visible.</p>",
        comment_count: 0,
      })
    );

    assert.deepEqual(parsed, { key: "progress", label: "In Progress" });
  });

  it("cleans metadata from descriptions and text excerpts", () => {
    assert.equal(
      featureRequestCleanDescription("[status: approved] [design] Make cards denser"),
      "Make cards denser"
    );
    assert.equal(
      featureRequestRowExcerpt(
        block({
          description: "",
          content: "<p>Status: reviewing</p><p>[design] Let owners tune cards.</p>",
        })
      ),
      "Let owners tune cards."
    );
  });
});

describe("feature request tag enrichment", () => {
  it("builds recurring filter tags and per-block metadata for public template rows", () => {
    const first = block({
      id: 11,
      title: "[design] [status: in progress] Card density",
      description: "Improve the list view.",
      comment_count: 3,
    });
    const second = block({
      id: 12,
      title: "[research] Import queue",
      description: "[design] Validate Are.na edge cases.",
      comment_count: 1,
    });
    const enriched = enrichFeatureRequestSiteData(siteData([first, second]));

    assert.deepEqual(enriched.feature_request_registry?.filterTags, [
      { slug: "design", label: "design", count: 3 },
      { slug: "research", label: "research", count: 2 },
    ]);
    assert.deepEqual(enriched.blocks[0]?.feature_request, {
      tagSlugs: ["design", "status-in-progress"],
      categoryLabel: "design",
    });
    assert.deepEqual(enriched.blocks[1]?.feature_request, {
      tagSlugs: ["research", "design"],
      categoryLabel: "research",
    });
  });

  it("leaves non-feature-request templates unchanged", () => {
    const original = siteData([block({ title: "[design] Blog post" })], "blog");

    assert.equal(enrichFeatureRequestSiteData(original), original);
  });

  it("preserves bracket order from HTML/plain fields and strips leading title labels", () => {
    const text = block({
      title: "[status: approved] [design] Better cards",
      description: "[research] <em>owners</em>",
      content: "<p>[priority high] Ship it</p>",
    });

    assert.deepEqual(orderedBracketTokensFromBlock(text), [
      "status: approved",
      "design",
      "research",
      "priority high",
    ]);
    assert.equal(featureRequestPrimaryTitle(text), "Better cards");
    assert.equal(slugifyBracketLabel("Priority: High!"), "priority-high");
  });
});
