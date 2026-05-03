import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Handlebars from "handlebars";

import type { TemplateBlock } from "./build";
import "./build";

function block(overrides: Partial<TemplateBlock>): TemplateBlock {
  return {
    id: overrides.id ?? 1,
    type: overrides.type ?? "text",
    title: overrides.title ?? "",
    description: overrides.description ?? "",
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2026-01-01T00:00:00Z",
    position: overrides.position ?? 1,
    image: overrides.image,
    content: overrides.content,
    link: overrides.link,
    embed: overrides.embed,
    attachment: overrides.attachment,
    source_url: overrides.source_url ?? null,
    comment_count: overrides.comment_count ?? 0,
    arena_url: overrides.arena_url ?? `https://www.are.na/block/${overrides.id ?? 1}`,
  };
}

function renderWithBlock(templateSource: string, item: TemplateBlock): string {
  return Handlebars.compile(templateSource)(item);
}

describe("directory template helpers", () => {
  it("keeps generated child pages for non-link rows and only sends link rows outbound", () => {
    const rowTemplate = [
      "{{directoryChildHref}}",
      "{{#if (directoryRowExternal)}}external{{else}}internal{{/if}}",
      "{{#if (directoryLinkIsOffArena)}}off-arena{{else}}arena{{/if}}",
    ].join("|");

    assert.equal(
      renderWithBlock(rowTemplate, block({ id: 17, type: "text", title: "Notes" })),
      "block-17.html|internal|arena"
    );
    assert.equal(
      renderWithBlock(
        rowTemplate,
        block({
          id: 18,
          type: "link",
          link: {
            url: "https://example.com/post",
            title: "External post",
            description: "",
            thumbnail: "",
            provider: "Example",
          },
        })
      ),
      "https://example.com/post|external|off-arena"
    );
    assert.equal(
      renderWithBlock(
        rowTemplate,
        block({
          id: 19,
          type: "link",
          link: {
            url: "https://www.are.na/tiny/channel",
            title: "Are.na reference",
            description: "",
            thumbnail: "",
            provider: "Are.na",
          },
        })
      ),
      "https://www.are.na/tiny/channel|external|arena"
    );
  });

  it("sorts by public row label and includes searchable metadata", () => {
    const template = Handlebars.compile(
      "{{#each (sortDirectoryBlocksAlpha blocks)}}{{directoryLabel this}}::{{directorySearchText this}}\n{{/each}}"
    );
    const rendered = template({
      blocks: [
        block({
          id: 1,
          type: "text",
          title: "",
          content: "<p>Zebra notes</p>",
          description: "Field journal",
        }),
        block({
          id: 2,
          type: "link",
          title: "Ignored when link has source title",
          link: {
            url: "https://example.com/alpha",
            title: "Alpha resource",
            description: "Reference material",
            thumbnail: "",
            provider: "Example",
          },
        }),
        block({
          id: 3,
          type: "attachment",
          title: "",
          description: "Downloadable brief",
          attachment: {
            url: "https://arena.test/brief.pdf",
            file_name: "brief.pdf",
            file_size: 1234,
            content_type: "application/pdf",
            extension: "pdf",
            kind: "pdf",
            kind_label: "PDF",
            type_label: "PDF",
            display_name: "Brief PDF",
            alt_text: "Brief PDF",
            preview_url: "https://arena.test/brief.pdf",
            preview_image_url: "",
            preview_image: "",
            preview_video_url: "",
            has_visual_preview: false,
            is_image: false,
            is_gif: false,
            is_video: false,
            is_pdf: true,
            is_model: false,
            is_audio: false,
            is_text: false,
            is_archive: false,
          },
        }),
      ],
    });

    assert.equal(
      rendered,
      [
        "Alpha resource::Ignored when link has source title Alpha resource Reference material https://example.com/alpha",
        "Brief PDF::Downloadable brief Brief PDF PDF PDF",
        "Zebra notes::Field journal Zebra notes",
        "",
      ].join("\n")
    );
  });

  it("chooses deterministic hover preview variants for text, PDF, and images", () => {
    const previewTemplate = [
      "{{directoryPreviewVariant}}",
      "{{directoryPreviewMediaUrl}}",
      "{{directoryPreviewTextAttr}}",
    ].join("|");

    assert.equal(
      renderWithBlock(
        previewTemplate,
        block({
          id: 4,
          type: "text",
          content: `<p>${"A".repeat(401)}</p>`,
        })
      ),
      `text||${"A".repeat(397)}\u2026`
    );
    assert.equal(
      renderWithBlock(
        previewTemplate,
        block({
          id: 5,
          type: "attachment",
          attachment: {
            url: "https://arena.test/spec.pdf",
            file_name: "spec.pdf",
            file_size: 42,
            content_type: "application/pdf",
            extension: "pdf",
            kind: "pdf",
            kind_label: "PDF",
            type_label: "PDF",
            display_name: "Spec PDF",
            alt_text: "Spec PDF",
            preview_url: "https://arena.test/spec.pdf",
            preview_image_url: "https://arena.test/poster.jpg",
            preview_image: "https://arena.test/poster.jpg",
            preview_video_url: "",
            has_visual_preview: true,
            is_image: false,
            is_gif: false,
            is_video: false,
            is_pdf: true,
            is_model: false,
            is_audio: false,
            is_text: false,
            is_archive: false,
          },
        })
      ),
      "pdf|https://arena.test/spec.pdf|"
    );
    assert.equal(
      renderWithBlock(
        previewTemplate,
        block({
          id: 6,
          type: "image",
          image: {
            original: "https://arena.test/original.jpg",
            large: "https://arena.test/large.jpg",
            square: "https://arena.test/square.jpg",
            display: "https://arena.test/display.jpg",
          },
        })
      ),
      "image|https://arena.test/display.jpg|"
    );
  });
});
