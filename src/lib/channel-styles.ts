import type { ArenaBlock } from "./arena";

/** Text block title (case-insensitive) — content is treated as site CSS and hidden from templates. */
export const CHANNEL_STYLES_BLOCK_TITLE = "styles.css";

export const STYLES_CSS_EMPTY_EDITOR_PLACEHOLDER =
  "No Text block titled “styles.css” on this channel yet. Add one on Are.na, or type CSS here and click Save to store it on tiny.garden.";

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Plain text / CSS from an Are.na Text block (handles HTML-ish content). */
export function arenaTextBlockToPlainCss(block: ArenaBlock): string {
  let raw = "";
  if (block.content_html && typeof block.content_html === "string") {
    raw = block.content_html;
  } else if (block.content) {
    if (typeof block.content === "string") {
      raw = block.content;
    } else if (typeof block.content === "object" && block.content !== null) {
      const c = block.content as Record<string, unknown>;
      raw =
        (typeof c.html === "string" && c.html) ||
        (typeof c.text === "string" && c.text) ||
        "";
    }
  }
  if (!raw.trim()) return "";

  if (raw.includes("<")) {
    const stripped = raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "\n");
    return decodeBasicEntities(stripped)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return raw.trim();
}

const STYLES_TITLE_CANONICAL = CHANNEL_STYLES_BLOCK_TITLE.toLowerCase();

/** Normalize block title for reserved-name checks (zwsp, NBSP, Unicode compat, basic entities). */
export function normalizeTitleForStylesReservedCheck(title: string): string {
  const cleaned = decodeBasicEntities(title || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFKC");
  return cleaned;
}

/** True when this display title is the reserved channel stylesheet block name. */
export function isReservedStylesCssTitle(title: string | null | undefined): boolean {
  return normalizeTitleForStylesReservedCheck(title || "") === STYLES_TITLE_CANONICAL;
}

/** Block title reserved for channel CSS — never shown in templates (any block type). */
export function isStylesCssBlockTitle(block: ArenaBlock): boolean {
  return isReservedStylesCssTitle(block.title);
}

/** First matching titled block in channel order that yields plain CSS. */
export function extractChannelStylesCss(blocks: ArenaBlock[]): string {
  for (const block of blocks) {
    if (!isStylesCssBlockTitle(block)) continue;
    const css = arenaTextBlockToPlainCss(block);
    if (css) return css;
  }
  return "";
}

export function filterOutChannelStylesBlocks(blocks: ArenaBlock[]): ArenaBlock[] {
  return blocks.filter((b) => !isStylesCssBlockTitle(b));
}

/** DB wins when set; otherwise CSS from the channel block. */
export function resolveSiteCustomCss(storedCustomCss: string | null | undefined, channelCss: string): string {
  const stored = (storedCustomCss || "").trim();
  if (stored) return stored;
  return (channelCss || "").trim();
}
