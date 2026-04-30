import type { SiteData, TemplateBlock } from "./build";
import {
  featureRequestBracketLabelToStatusKey,
  featureRequestSearchText,
  featureRequestStripHtml,
  featureRequestStripTitleBrackets,
  type FeatureRequestStatusKey,
} from "./feature-request-status";

/** Every `[label]` in order of appearance (title → description → body, etc.). */
export function extractBracketLabelsInOrder(text: string): string[] {
  const re = /\[([^\]]+)\]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1].trim();
    if (inner) out.push(inner);
  }
  return out;
}

export function slugifyBracketLabel(raw: string): string {
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return s;
}

function defaultCategoryForType(type: TemplateBlock["type"]): string {
  switch (type) {
    case "image":
      return "Media";
    case "text":
      return "Text";
    case "link":
      return "Link";
    case "media":
      return "Embed";
    case "attachment":
      return "Attachment";
    default:
      return "Block";
  }
}

/** Bracket tokens in reading order for one block (title, then description, then type-specific fields). */
export function orderedBracketTokensFromBlock(block: TemplateBlock): string[] {
  const out: string[] = [];
  const segments: Array<string | undefined> = [
    block.title,
    block.description,
    block.type === "text" ? block.content : undefined,
    block.type === "link" && block.link ? block.link.title : undefined,
    block.type === "link" && block.link ? block.link.description : undefined,
  ];
  for (const seg of segments) {
    if (typeof seg !== "string" || !seg.trim()) continue;
    const plain = seg.includes("<") ? featureRequestStripHtml(seg) : seg;
    out.push(...extractBracketLabelsInOrder(plain));
  }
  return out;
}

function collectBlockTextForTagFrequency(block: TemplateBlock): string {
  const parts: string[] = [];
  if (block.title?.trim()) parts.push(block.title);
  if (block.description?.trim()) parts.push(block.description);
  if (block.type === "text" && block.content?.trim()) {
    parts.push(featureRequestStripHtml(block.content));
  }
  if (block.type === "link" && block.link) {
    if (block.link.title?.trim()) parts.push(block.link.title);
    if (block.link.description?.trim()) parts.push(block.link.description);
  }
  return parts.join("\n");
}

/** Primary display title with leading `[tags]` removed (same logic for row + detail). */
export function featureRequestPrimaryTitle(block: TemplateBlock): string {
  if (block.type === "image") {
    if (block.title?.trim()) {
      const s = featureRequestStripTitleBrackets(block.title);
      return s.length > 0 ? s : "Image";
    }
    return "Image";
  }
  if (block.type === "text" && block.title?.trim()) {
    return featureRequestStripTitleBrackets(block.title);
  }
  if (block.type === "link") {
    const raw = block.title?.trim() || block.link?.title || "";
    if (raw) {
      const s = featureRequestStripTitleBrackets(raw);
      return s.length > 0 ? s : "Link";
    }
    return "Link";
  }
  if (block.type === "media" && block.title?.trim()) {
    return featureRequestStripTitleBrackets(block.title);
  }
  if (block.type === "attachment") {
    const raw =
      block.title?.trim() || block.attachment?.display_name?.trim() || "";
    if (raw) {
      const s = featureRequestStripTitleBrackets(raw);
      return s.length > 0 ? s : "Attachment";
    }
    return "Attachment";
  }
  return defaultCategoryForType(block.type);
}

function computeCategoryLabel(block: TemplateBlock): string {
  for (const token of orderedBracketTokensFromBlock(block)) {
    if (!featureRequestBracketLabelToStatusKey(token)) {
      return token.trim();
    }
  }
  return defaultCategoryForType(block.type);
}

function computeBlockMeta(block: TemplateBlock): NonNullable<TemplateBlock["feature_request"]> {
  const ordered = orderedBracketTokensFromBlock(block);
  const tagSlugs = [
    ...new Set(ordered.map((t) => slugifyBracketLabel(t)).filter(Boolean)),
  ];
  return {
    tagSlugs,
    categoryLabel: computeCategoryLabel(block),
  };
}

/**
 * Builds filter chips from `[bracket]` labels that recur across the channel (or appear in the
 * channel description plus at least one block). Merges into each block `feature_request` meta.
 */
export function enrichFeatureRequestSiteData(siteData: SiteData): SiteData {
  if (siteData.site.template !== "feature-requests") {
    return siteData;
  }

  const channelDesc = siteData.channel.description || "";
  const channelSlugs = new Set(
    extractBracketLabelsInOrder(channelDesc)
      .map((l) => slugifyBracketLabel(l))
      .filter(Boolean)
  );

  const slugCounts = new Map<string, number>();
  const slugToLabel = new Map<string, string>();

  function bump(labels: string[]) {
    for (const raw of labels) {
      const slug = slugifyBracketLabel(raw);
      if (!slug) continue;
      if (!slugToLabel.has(slug)) slugToLabel.set(slug, raw.trim());
      slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
    }
  }

  bump(extractBracketLabelsInOrder(channelDesc));

  for (const block of siteData.blocks) {
    bump(extractBracketLabelsInOrder(collectBlockTextForTagFrequency(block)));
  }

  const filterTags: Array<{ slug: string; label: string; count: number }> = [];
  for (const [slug, count] of slugCounts) {
    if (count >= 2 || (count >= 1 && channelSlugs.has(slug))) {
      filterTags.push({
        slug,
        label: slugToLabel.get(slug) || slug,
        count,
      });
    }
  }
  filterTags.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const blocks = siteData.blocks.map((block) => ({
    ...block,
    feature_request: computeBlockMeta(block),
  }));

  return {
    ...siteData,
    blocks,
    feature_request_registry: { filterTags },
  };
}

export type FeatureRequestRegistry = NonNullable<SiteData["feature_request_registry"]>;

export function registerFeatureRequestRowHelpers(H: {
  registerHelper(name: string, helper: (...args: unknown[]) => unknown): void;
}): void {
  H.registerHelper("featureRequestCategoryLabel", function (this: TemplateBlock) {
    return this.feature_request?.categoryLabel ?? defaultCategoryForType(this.type);
  });
  H.registerHelper("featureRequestTagSlugsAttr", function (this: TemplateBlock) {
    return (this.feature_request?.tagSlugs ?? []).join(" ");
  });
  H.registerHelper("featureRequestRowTitle", function (this: TemplateBlock) {
    return featureRequestPrimaryTitle(this);
  });
}
