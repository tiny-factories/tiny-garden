import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { ArenaClient, ArenaBlock, ArenaChannel } from "./arena";
import {
  extractChannelStylesCss,
  filterOutChannelStylesBlocks,
  isReservedStylesCssTitle,
  resolveSiteCustomCss,
} from "./channel-styles";
import { prisma } from "./db";
import { fontFamilyCSS, googleFontsLinkTag } from "./fonts";
import { generatePlantSVG, generatePlantDataURI, seedFromSubdomain } from "./garden-icon";
import { isKnownTemplateSlug } from "./templates-manifest";
import { registerFeatureRequestHandlebarsHelpers } from "./feature-request-status";
import {
  enrichFeatureRequestSiteData,
  registerFeatureRequestRowHelpers,
} from "./feature-request-tags";
import { escapeStyleTagContent } from "./theme-css-tokens";
import { normalizeSiteSubdomain } from "./subdomain";

// Map of original URL → blob URL for rewriting
type AssetMap = Map<string, string>;

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function getExtension(url: string, contentType?: string): string {
  // Try from URL path
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath).toLowerCase();
  if (ext && ext.length <= 5) return ext;

  // Fallback to content-type
  const typeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
  };
  return (contentType && typeMap[contentType]) || ".bin";
}

async function downloadAndUploadAsset(
  originalUrl: string,
  blobPath: string,
  blobToken: string
): Promise<string | null> {
  try {
    const res = await fetch(originalUrl);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await res.arrayBuffer());

    const ext = getExtension(originalUrl, contentType);
    const hash = hashUrl(originalUrl);
    const assetPath = `${blobPath}/${hash}${ext}`;

    const blob = await put(assetPath, buffer, {
      access: "private",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blobToken,
    });

    return blob.url;
  } catch (error) {
    console.error(`Failed to download asset: ${originalUrl}`, error);
    return null;
  }
}

async function processAssets(
  blocks: TemplateBlock[],
  avatarUrl: string,
  blobPath: string,
  blobToken: string
): Promise<AssetMap> {
  const assetMap: AssetMap = new Map();
  const urls: string[] = [];

  // Collect all asset URLs from blocks
  for (const block of blocks) {
    if (block.image) {
      if (block.image.display) urls.push(block.image.display);
      if (block.image.original && block.image.original !== block.image.display) urls.push(block.image.original);
    }
    if (block.link?.thumbnail) urls.push(block.link.thumbnail);
    if (block.attachment?.url) urls.push(block.attachment.url);
  }

  // Include avatar
  if (avatarUrl) urls.push(avatarUrl);

  // Deduplicate
  const unique = [...new Set(urls.filter(Boolean))];

  // Download and upload in batches of 10
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    const results = await Promise.all(
      batch.map((url) => downloadAndUploadAsset(url, blobPath, blobToken))
    );
    batch.forEach((url, idx) => {
      if (results[idx]) {
        assetMap.set(url, results[idx]!);
      }
    });
  }

  return assetMap;
}

function rewriteUrls(html: string, assetMap: AssetMap, appUrl: string): string {
  let result = html;
  for (const [original, blobUrl] of assetMap) {
    // Use asset proxy route so URLs never expire
    const proxyUrl = `${appUrl}/api/asset?url=${encodeURIComponent(blobUrl)}`;
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), proxyUrl);
  }
  return result;
}

export interface SiteData {
  channel: {
    title: string;
    slug: string;
    description: string;
    user: {
      name: string;
      slug: string;
      avatar_url: string;
    };
    created_at: string;
    updated_at: string;
    length: number;
  };
  blocks: TemplateBlock[];
  site: {
    subdomain: string;
    url: string;
    template: string;
    custom_css: string;
    built_at: string;
  };
  /** Feature Requests template: recurring `[bracket]` tags for filter chips. */
  feature_request_registry?: {
    filterTags: Array<{ slug: string; label: string; count: number }>;
  };
}

/** Maps Are.na API channel JSON to template `channel` root — used by builds and template previews. */
export function arenaChannelToSiteDataChannel(
  channel: ArenaChannel
): SiteData["channel"] {
  return {
    title: channel.title,
    slug: channel.slug,
    description:
      typeof channel.description === "string" ? channel.description : "",
    user: {
      name:
        channel.owner?.name ||
        channel.owner?.full_name ||
        channel.owner?.username ||
        channel.user?.full_name ||
        "",
      slug: channel.owner?.slug || channel.user?.slug || "",
      avatar_url:
        channel.owner?.avatar ||
        channel.owner?.avatar_image?.display ||
        channel.user?.avatar_image?.display ||
        "",
    },
    created_at: channel.created_at,
    updated_at: channel.updated_at,
    length: channel.length || channel.counts?.contents || 0,
  };
}

export interface TemplateBlock {
  id: number;
  type: "image" | "text" | "link" | "media" | "attachment";
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  position: number;
  image?: {
    original: string;
    large: string;
    square: string;
    display: string;
    /** From Are.na when available — used for photography bento layout by aspect ratio. */
    width?: number;
    height?: number;
  };
  content?: string;
  link?: {
    url: string;
    title: string;
    description: string;
    thumbnail: string;
    provider: string;
  };
  embed?: {
    url: string;
    html: string;
    provider: string;
  };
  attachment?: {
    url: string;
    file_name: string;
    file_size: number;
    content_type: string;
    extension: string;
    kind: "image" | "gif" | "video" | "pdf" | "model" | "audio" | "text" | "archive" | "other";
    kind_label: string;
    type_label: string;
    display_name: string;
    alt_text: string;
    preview_url: string;
    preview_image_url: string;
    preview_image: string;
    preview_video_url: string;
    has_visual_preview: boolean;
    is_image: boolean;
    is_gif: boolean;
    is_video: boolean;
    is_pdf: boolean;
    is_model: boolean;
    is_audio: boolean;
    is_text: boolean;
    is_archive: boolean;
  };
  source_url: string | null;
  comment_count: number;
  arena_url: string;
  /** Feature Requests template: filled at build from `[tag]` patterns. */
  feature_request?: {
    tagSlugs: string[];
    categoryLabel: string;
  };
}

function pickFirstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function getFileExtension(value: string): string {
  if (!value) return "";
  const cleaned = value.split("#")[0]?.split("?")[0] || "";
  const ext = path.extname(cleaned).toLowerCase().replace(/^\./, "");
  return ext;
}

function coercePositiveInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

/** Read width/height from Are.na v3 image object and block (original pixels when present). */
function extractImagePixelDimensions(
  img: Record<string, unknown>,
  block: ArenaBlock
): { width?: number; height?: number } {
  let width = coercePositiveInt(img.width);
  let height = coercePositiveInt(img.height);

  const tryNested = (key: string) => {
    const sub = img[key];
    if (sub && typeof sub === "object") {
      const o = sub as Record<string, unknown>;
      if (!width) width = coercePositiveInt(o.width);
      if (!height) height = coercePositiveInt(o.height);
    }
  };
  for (const k of ["original", "large", "medium", "display", "square"]) {
    tryNested(k);
  }

  const br = block as unknown as Record<string, unknown>;
  if (!width) width = coercePositiveInt(br.width);
  if (!height) height = coercePositiveInt(br.height);

  return { width, height };
}

type AttachmentKind = TemplateBlock["attachment"] extends infer A
  ? A extends { kind: infer K } ? K : never
  : never;

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "ogv", "m4v"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac"]);
const MODEL_EXTENSIONS = new Set(["stl", "obj", "glb", "gltf", "ply", "fbx", "usd", "usdz", "3mf"]);
const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "csv", "json", "xml", "yaml", "yml", "rtf", "doc", "docx"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz"]);

function classifyAttachment(contentType: string, extension: string): AttachmentKind {
  const ct = contentType.toLowerCase();
  const ext = extension.toLowerCase();

  if (ct.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "svg", "avif", "heic", "heif", "gif"].includes(ext)) {
    if (ct === "image/gif" || ext === "gif") return "gif";
    return "image";
  }
  if (ct.startsWith("video/") || VIDEO_EXTENSIONS.has(ext)) return "video";
  if (ct === "application/pdf" || ext === "pdf") return "pdf";
  if (ct.startsWith("audio/") || AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (ct.startsWith("model/") || MODEL_EXTENSIONS.has(ext)) return "model";
  if (ct.startsWith("text/") || TEXT_EXTENSIONS.has(ext)) return "text";
  if (ct.includes("zip") || ct.includes("archive") || ARCHIVE_EXTENSIONS.has(ext)) return "archive";
  return "other";
}

function getAttachmentKindLabel(kind: AttachmentKind): string {
  switch (kind) {
    case "image":
      return "Image";
    case "gif":
      return "GIF";
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "model":
      return "3D Model";
    case "audio":
      return "Audio";
    case "text":
      return "Document";
    case "archive":
      return "Archive";
    default:
      return "File";
  }
}

function normalizeBlock(block: ArenaBlock): TemplateBlock {
  const typeMap: Record<string, TemplateBlock["type"]> = {
    Image: "image",
    Text: "text",
    Link: "link",
    Media: "media",
    Attachment: "attachment",
    Embed: "media",
    // v3 lowercase variants
    image: "image",
    text: "text",
    link: "link",
    media: "media",
    embed: "media",
    attachment: "attachment",
  };

  // v3 uses "type", v2 uses "class"
  const rawType = block.class || block.type || "";

  const normalized: TemplateBlock = {
    id: block.id,
    type: typeMap[rawType] || (block.image ? "image" : "text"),
    title: block.title || "",
    description: block.description || "",
    created_at: block.created_at,
    updated_at: block.updated_at,
    position: block.position,
    source_url: null,
    comment_count: block.comment_count || 0,
    arena_url: `https://www.are.na/block/${block.id}`,
  };

  if (block.image) {
    const img = block.image as Record<string, unknown>;
    // v3: image.src for original, image.large.src for sizes
    // v2: image.original.url, image.large.url
    const getSrc = (val: unknown): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      if (typeof val === "object" && val !== null) {
        const obj = val as Record<string, unknown>;
        if (typeof obj.src === "string") return obj.src;
        if (typeof obj.url === "string") return obj.url;
      }
      return "";
    };
    const original = typeof img.src === "string" ? img.src : getSrc(img.original);
    const large = getSrc(img.large) || original;
    const square = getSrc(img.square) || getSrc(img.medium) || original;
    const display = getSrc(img.medium) || large || original;

    const dims = extractImagePixelDimensions(img, block);
    normalized.image = { original, large, square, display };
    if (dims.width && dims.height) {
      normalized.image.width = dims.width;
      normalized.image.height = dims.height;
    }
    normalized.source_url = original || display;
  }

  if (block.content_html) {
    normalized.content = typeof block.content_html === "string"
      ? block.content_html
      : String(block.content_html);
  } else if (block.content) {
    normalized.content = typeof block.content === "string"
      ? block.content
      : (block.content as Record<string, unknown>).html as string
        || (block.content as Record<string, unknown>).text as string
        || JSON.stringify(block.content);
  }

  if (block.source) {
    normalized.link = {
      url: block.source.url,
      title: block.source.title || block.title || "",
      description: block.source.description || "",
      thumbnail: normalized.image?.display || "",
      provider: block.source.provider?.name || "",
    };
    normalized.source_url = block.source.url;
  }

  if (block.embed) {
    normalized.embed = {
      url: block.embed.url,
      html: block.embed.html,
      provider: block.source?.provider?.name || "",
    };
    normalized.source_url = block.embed.url;
  }

  if (block.attachment) {
    const contentType = (block.attachment.content_type || "").toLowerCase();
    const extension = pickFirstNonEmpty(
      getFileExtension(block.attachment.file_name),
      getFileExtension(block.attachment.url)
    );
    const kind = classifyAttachment(contentType, extension);
    const previewImageUrl = kind === "image" || kind === "gif"
      ? pickFirstNonEmpty(normalized.image?.display, block.attachment.url)
      : pickFirstNonEmpty(normalized.image?.display);
    const previewVideoUrl = kind === "video" ? block.attachment.url : "";
    const previewUrl = kind === "video" || kind === "pdf"
      ? block.attachment.url
      : previewImageUrl;
    const attachmentLabel = pickFirstNonEmpty(
      normalized.title,
      normalized.description,
      block.attachment.file_name,
      "Attachment"
    );
    const kindLabel = getAttachmentKindLabel(kind);

    normalized.attachment = {
      url: block.attachment.url,
      file_name: block.attachment.file_name,
      file_size: block.attachment.file_size,
      content_type: contentType,
      extension,
      kind,
      kind_label: kindLabel,
      type_label: kindLabel,
      display_name: attachmentLabel,
      alt_text: pickFirstNonEmpty(normalized.title, normalized.description, attachmentLabel),
      preview_url: previewUrl,
      preview_image_url: previewImageUrl,
      preview_image: previewImageUrl,
      preview_video_url: previewVideoUrl,
      has_visual_preview: Boolean(previewImageUrl),
      is_image: kind === "image",
      is_gif: kind === "gif",
      is_video: kind === "video",
      is_pdf: kind === "pdf",
      is_model: kind === "model",
      is_audio: kind === "audio",
      is_text: kind === "text",
      is_archive: kind === "archive",
    };
    normalized.source_url = block.attachment.url;
  }

  return normalized;
}

/** Are.na channel blocks → template blocks (omits reserved `styles.css` title). */
export function channelBlocksForTemplate(blocks: ArenaBlock[]): TemplateBlock[] {
  return filterOutChannelStylesBlocks(blocks)
    .map(normalizeBlock)
    .filter((b) => !isReservedStylesCssTitle(b.title));
}

function stripHtmlToPlain(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getDirectoryRowLabel(block: TemplateBlock): string {
  switch (block.type) {
    case "image":
      return pickFirstNonEmpty(block.title, block.description, "Image");
    case "text":
      return pickFirstNonEmpty(
        block.title,
        stripHtmlToPlain(block.content || "").slice(0, 120),
        "Text"
      );
    case "link":
      return pickFirstNonEmpty(block.link?.title, block.title, block.link?.url, "Link");
    case "media":
      return pickFirstNonEmpty(block.title, block.description, "Media");
    case "attachment":
      return pickFirstNonEmpty(block.attachment?.display_name, block.title, "Attachment");
    default:
      return pickFirstNonEmpty(
        block.title,
        block.description,
        block.id != null ? `Block ${block.id}` : "",
        "Untitled"
      );
  }
}

function sortDirectoryBlocksAlpha(blocks: TemplateBlock[]): TemplateBlock[] {
  const labeled = blocks.map((block) => ({
    block,
    label: getDirectoryRowLabel(block),
  }));
  labeled.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return labeled.map((x) => x.block);
}

function directorySearchText(block: TemplateBlock): string {
  const parts: string[] = [block.title, block.description];
  if (block.content) parts.push(stripHtmlToPlain(block.content));
  if (block.link) {
    parts.push(block.link.title, block.link.description, block.link.url);
  }
  if (block.attachment) {
    parts.push(
      block.attachment.display_name,
      block.attachment.type_label,
      block.attachment.kind_label
    );
  }
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function directoryPreviewUrl(block: TemplateBlock): string {
  switch (block.type) {
    case "image":
      return block.image?.display || "";
    case "link":
      return pickFirstNonEmpty(block.link?.thumbnail, block.image?.display);
    case "attachment":
      if (block.attachment?.kind === "pdf") return "";
      return pickFirstNonEmpty(block.attachment?.preview_image_url, block.attachment?.preview_image);
    default:
      return "";
  }
}

/** Finder grid/list thumbnails — uses Are.na previews when present (incl. PDF poster frames). */
export function finderThumbUrl(block: TemplateBlock): string {
  switch (block.type) {
    case "image":
      return block.image?.display || "";
    case "link":
      return pickFirstNonEmpty(block.link?.thumbnail, block.image?.display);
    case "media":
      return block.image?.display || "";
    case "text":
      return "";
    case "attachment": {
      const a = block.attachment;
      if (!a) return "";
      if (a.is_image || a.is_gif) {
        return pickFirstNonEmpty(
          block.image?.display,
          a.preview_image_url,
          a.preview_image,
          a.url
        );
      }
      if (a.is_video) {
        return pickFirstNonEmpty(
          a.preview_image_url,
          a.preview_image,
          block.image?.display
        );
      }
      if (a.is_pdf) {
        return pickFirstNonEmpty(a.preview_image_url, a.preview_image);
      }
      return pickFirstNonEmpty(
        a.preview_image_url,
        a.preview_image,
        block.image?.display
      );
    }
    default:
      return "";
  }
}

/** URL opened when double-clicking a Finder item (new tab). */
export function finderOpenUrl(block: TemplateBlock): string {
  if (block.type === "link" && block.link?.url) return block.link.url;
  if (block.type === "attachment" && block.attachment?.url) return block.attachment.url;
  return block.arena_url;
}

/** Finder grid/list thumbs: use object-fit contain for PDF / 3D / video posters so previews are not cropped. */
export function finderThumbContain(block: TemplateBlock): boolean {
  if (block.type !== "attachment" || !block.attachment) return false;
  const a = block.attachment;
  return a.is_pdf || a.is_model || a.is_video;
}

function directoryPreviewTextExcerpt(block: TemplateBlock): string {
  if (block.type !== "text" || !block.content) return "";
  const plain = stripHtmlToPlain(block.content);
  if (!plain) return "";
  if (plain.length <= 400) return plain;
  return `${plain.slice(0, 397).trim()}…`;
}

function directoryPreviewVariant(block: TemplateBlock): string {
  if (block.type === "text") {
    return directoryPreviewTextExcerpt(block) ? "text" : "none";
  }
  if (block.type === "attachment" && block.attachment?.kind === "pdf" && block.attachment.url) {
    return "pdf";
  }
  if (directoryPreviewUrl(block)) return "image";
  return "none";
}

function directoryPreviewMediaUrl(block: TemplateBlock): string {
  if (block.type === "attachment" && block.attachment?.kind === "pdf" && block.attachment.url) {
    return block.attachment.url;
  }
  return directoryPreviewUrl(block);
}

function directoryRowHref(block: TemplateBlock): string {
  if (block.type === "link" && block.link?.url) return block.link.url;
  return block.arena_url;
}

/** True when the list row should open in a new tab (outbound link blocks only). Child pages use same-tab navigation. */
function directoryRowExternal(block: TemplateBlock): boolean {
  if (block.type === "link" && block.link?.url) {
    return /^https?:\/\//i.test(block.link.url);
  }
  return false;
}

/** Link blocks only: true when the outbound URL is not on are.na (external / “leaves” the archive). */
function directoryLinkIsOffArena(block: TemplateBlock): boolean {
  if (block.type !== "link" || !block.link?.url) return false;
  const raw = block.link.url.trim();
  if (!raw) return false;
  if (/^mailto:/i.test(raw) || /^tel:/i.test(raw)) return true;
  if (!/^https?:\/\//i.test(raw)) return true;
  try {
    const u = new URL(raw);
    const h = u.hostname.replace(/^www\./, "").toLowerCase();
    return h !== "are.na" && !h.endsWith(".are.na");
  } catch {
    return false;
  }
}

function directoryKindLabel(block: TemplateBlock): string {
  switch (block.type) {
    case "image":
      return "Image";
    case "text":
      return "Text";
    case "link":
      return "Link";
    case "media":
      return "Media";
    case "attachment":
      return block.attachment?.kind_label || "File";
    default:
      return "";
  }
}

/** List row href: outbound link URL, or static child page for other block types. */
function directoryChildHref(block: TemplateBlock): string {
  if (block.type === "link" && block.link?.url) return block.link.url;
  return `block-${block.id}.html`;
}

function applyStaticPageFinishes(
  html: string,
  opts: {
    styleContent: string;
    faviconURI: string;
    gardenFooter: string;
    themeFontLinks: string;
    themeOverrideCss: string;
    effectiveCustomCss: string;
  }
): string {
  let out = html;
  if (opts.styleContent) {
    out = out.replace(
      /<link[^>]*rel=["']stylesheet["'][^>]*href=["']style\.css["'][^>]*\/?>/i,
      `<style>${escapeStyleTagContent(opts.styleContent)}</style>`
    );
  }
  out = out.replace("</head>", `<link rel="icon" type="image/svg+xml" href="${opts.faviconURI}">\n</head>`);
  if (out.includes("</body>")) {
    out = out.replace("</body>", `${opts.gardenFooter}\n</body>`);
  } else {
    out += opts.gardenFooter;
  }
  const themeInjection =
    opts.themeFontLinks + (opts.themeOverrideCss ? `<style>${escapeStyleTagContent(opts.themeOverrideCss)}</style>\n` : "");
  if (themeInjection) {
    out = out.replace("</head>", `${themeInjection}</head>`);
  }
  if (opts.effectiveCustomCss) {
    const siteCssInjection = `<style id="tiny-garden-site-css">\n${escapeStyleTagContent(opts.effectiveCustomCss)}\n</style>\n`;
    if (out.includes("</head>")) {
      out = out.replace("</head>", `${siteCssInjection}</head>`);
    } else {
      out = siteCssInjection + out;
    }
  }
  return out;
}

async function emitDirectoryBlockPages(params: {
  siteTemplate: string;
  templateDir: string;
  siteData: SiteData;
  styleContent: string;
  faviconURI: string;
  gardenFooter: string;
  themeFontLinks: string;
  themeOverrideCss: string;
  effectiveCustomCss: string;
  assetMap: AssetMap;
  appUrl: string;
  blobToken: string | undefined;
  blobSitePrefix: string;
  outputDir: string | null;
}): Promise<void> {
  if (params.siteTemplate !== "directory") return;
  const detailPath = path.join(params.templateDir, "block-detail.hbs");
  const pagePath = path.join(params.templateDir, "block-page.hbs");
  const detailSrc = await fs.readFile(detailPath, "utf-8").catch(() => null);
  const pageSrc = await fs.readFile(pagePath, "utf-8").catch(() => null);
  if (!detailSrc || !pageSrc) return;
  Handlebars.registerPartial("blockDetail", detailSrc);
  const pageTemplate = Handlebars.compile(pageSrc);
  const finishOpts = {
    styleContent: params.styleContent,
    faviconURI: params.faviconURI,
    gardenFooter: params.gardenFooter,
    themeFontLinks: params.themeFontLinks,
    themeOverrideCss: params.themeOverrideCss,
    effectiveCustomCss: params.effectiveCustomCss,
  };
  for (const block of params.siteData.blocks) {
    let pageHtml = pageTemplate({ ...params.siteData, block, styles: params.styleContent });
    pageHtml = applyStaticPageFinishes(pageHtml, finishOpts);
    if (params.assetMap.size > 0) {
      pageHtml = rewriteUrls(pageHtml, params.assetMap, params.appUrl);
    }
    const filename = `block-${block.id}.html`;
    if (params.blobToken) {
      await put(`${params.blobSitePrefix}/${filename}`, pageHtml, {
        access: "private",
        contentType: "text/html",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: params.blobToken,
      });
    }
    if (params.outputDir) {
      await fs.writeFile(path.join(params.outputDir, filename), pageHtml);
    }
  }
}

async function emitFeatureRequestsBlockPages(params: {
  siteTemplate: string;
  templateDir: string;
  siteData: SiteData;
  styleContent: string;
  faviconURI: string;
  gardenFooter: string;
  themeFontLinks: string;
  themeOverrideCss: string;
  effectiveCustomCss: string;
  assetMap: AssetMap;
  appUrl: string;
  blobToken: string | undefined;
  blobSitePrefix: string;
  outputDir: string | null;
}): Promise<void> {
  if (params.siteTemplate !== "feature-requests") return;
  const detailPath = path.join(params.templateDir, "block-detail.hbs");
  const pagePath = path.join(params.templateDir, "block-page.hbs");
  const detailSrc = await fs.readFile(detailPath, "utf-8").catch(() => null);
  const pageSrc = await fs.readFile(pagePath, "utf-8").catch(() => null);
  if (!detailSrc || !pageSrc) return;
  Handlebars.registerPartial("blockDetail", detailSrc);
  const pageTemplate = Handlebars.compile(pageSrc);
  const finishOpts = {
    styleContent: params.styleContent,
    faviconURI: params.faviconURI,
    gardenFooter: params.gardenFooter,
    themeFontLinks: params.themeFontLinks,
    themeOverrideCss: params.themeOverrideCss,
    effectiveCustomCss: params.effectiveCustomCss,
  };
  for (const block of params.siteData.blocks) {
    let pageHtml = pageTemplate({ ...params.siteData, block, styles: params.styleContent });
    pageHtml = applyStaticPageFinishes(pageHtml, finishOpts);
    if (params.assetMap.size > 0) {
      pageHtml = rewriteUrls(pageHtml, params.assetMap, params.appUrl);
    }
    const filename = `block-${block.id}.html`;
    if (params.blobToken) {
      await put(`${params.blobSitePrefix}/${filename}`, pageHtml, {
        access: "private",
        contentType: "text/html",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: params.blobToken,
      });
    }
    if (params.outputDir) {
      await fs.writeFile(path.join(params.outputDir, filename), pageHtml);
    }
  }
}

Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper("gt", (a: unknown, b: unknown) => Number(a) > Number(b));
registerFeatureRequestHandlebarsHelpers(Handlebars);
registerFeatureRequestRowHelpers(Handlebars);

/**
 * When Are.na omits image pixel dimensions, photography layout falls back to this cycle
 * (otherwise layout uses {@link photoCellClassFromDimensions}).
 */
const PHOTO_CELL_FALLBACK_LAYOUTS = [
  "wide",
  "tall",
  "square",
  "wide",
  "square",
  "tall",
  "square",
  "wide",
] as const;

/** Map intrinsic aspect ratio → CSS cell modifier (12-column bento). */
function photoCellClassFromDimensions(width: number, height: number): string {
  const r = width / height;
  if (r >= 1.95) return "hero";
  if (r >= 1.2) return "wide";
  if (r <= 0.82) return "tall";
  return "square";
}

function photoImageIndexInChannel(blocks: TemplateBlock[], block: TemplateBlock): number {
  let imageIndex = 0;
  for (const item of blocks) {
    if (item.type !== "image") continue;
    if (item.id === block.id) return imageIndex;
    imageIndex++;
  }
  return 0;
}

/** Photography template: bento cell from image aspect ratio when width/height exist; else fallback cycle. */
Handlebars.registerHelper("photoCellClass", (blocks: unknown, block: unknown) => {
  if (!block || typeof block !== "object") return "square";
  const b = block as TemplateBlock;
  if (b.type !== "image" || !b.image) return "square";
  const w = b.image.width;
  const h = b.image.height;
  if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
    return photoCellClassFromDimensions(w, h);
  }
  if (!Array.isArray(blocks)) return "square";
  const idx = photoImageIndexInChannel(blocks as TemplateBlock[], b);
  return PHOTO_CELL_FALLBACK_LAYOUTS[idx % PHOTO_CELL_FALLBACK_LAYOUTS.length] ?? "square";
});

/** Sequence label e.g. `001/A` for stamp metadata on photography template image cells. */
Handlebars.registerHelper("photoImageSeq", (blocks: unknown, block: unknown) => {
  if (!Array.isArray(blocks) || !block || typeof block !== "object") return "001/A";
  const idx = photoImageIndexInChannel(blocks as TemplateBlock[], block as TemplateBlock);
  return `${String(idx + 1).padStart(3, "0")}/A`;
});

Handlebars.registerHelper("isReservedStylesCssTitle", (title: unknown) =>
  typeof title === "string" && isReservedStylesCssTitle(title)
);

function parseDate(dateStr: string): Date | null {
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

Handlebars.registerHelper("formatYear", (dateStr: unknown) => {
  if (typeof dateStr !== "string") return "";
  const parsed = parseDate(dateStr);
  return parsed ? String(parsed.getUTCFullYear()) : "";
});

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

Handlebars.registerHelper("formatDate", (dateStr: string) => {
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr;
  return `${parsed.getUTCFullYear()}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())}`;
});

Handlebars.registerHelper("formatDateTime24", (dateStr: string) => {
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr;
  return `${parsed.getUTCFullYear()}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())} ${pad2(parsed.getUTCHours())}:${pad2(parsed.getUTCMinutes())}`;
});

Handlebars.registerHelper("sortDirectoryBlocksAlpha", (blocks: unknown) => {
  if (!Array.isArray(blocks)) return [];
  return sortDirectoryBlocksAlpha(blocks as TemplateBlock[]);
});

/** Bare `{{directoryLabel}}` passes Handlebars options as the first arg, not the block — use `this` unless arg is an explicit block (e.g. `{{directoryLabel this}}`). */
function directoryLabelHelperArgBlock(arg: unknown, self: TemplateBlock): TemplateBlock {
  if (
    arg !== undefined &&
    arg !== null &&
    typeof arg === "object" &&
    !("lookupProperty" in arg) &&
    typeof (arg as TemplateBlock).id === "number" &&
    typeof (arg as TemplateBlock).type === "string"
  ) {
    return arg as TemplateBlock;
  }
  return self;
}

Handlebars.registerHelper("directoryLabel", function (
  this: TemplateBlock,
  arg?: unknown
) {
  return getDirectoryRowLabel(directoryLabelHelperArgBlock(arg, this));
});
Handlebars.registerHelper("directorySearchText", function (this: TemplateBlock) {
  return directorySearchText(this);
});
Handlebars.registerHelper("finderThumbUrl", function (this: TemplateBlock) {
  return finderThumbUrl(this);
});
Handlebars.registerHelper("finderOpenUrl", function (this: TemplateBlock) {
  return finderOpenUrl(this);
});
Handlebars.registerHelper("finderThumbContain", function (this: TemplateBlock) {
  return finderThumbContain(this);
});
Handlebars.registerHelper("directoryPreviewUrl", function (this: TemplateBlock) {
  return directoryPreviewUrl(this);
});
Handlebars.registerHelper("directoryPreviewVariant", function (this: TemplateBlock) {
  return directoryPreviewVariant(this);
});
Handlebars.registerHelper("directoryPreviewMediaUrl", function (this: TemplateBlock) {
  return directoryPreviewMediaUrl(this);
});
Handlebars.registerHelper("directoryPreviewTextAttr", function (this: TemplateBlock) {
  return directoryPreviewTextExcerpt(this);
});
Handlebars.registerHelper("directoryRowHref", function (this: TemplateBlock) {
  return directoryRowHref(this);
});
Handlebars.registerHelper("directoryRowExternal", function (this: TemplateBlock) {
  return directoryRowExternal(this);
});
Handlebars.registerHelper("directoryLinkIsOffArena", function (this: TemplateBlock) {
  return directoryLinkIsOffArena(this);
});
Handlebars.registerHelper("directoryKindLabel", function (this: TemplateBlock) {
  return directoryKindLabel(this);
});
Handlebars.registerHelper("directoryChildHref", function (this: TemplateBlock) {
  return directoryChildHref(this);
});

export async function buildSite(siteId: string): Promise<string> {
  try {
    return await runBuild(siteId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Build failed";
    const truncated =
      message.length > 2000 ? `${message.slice(0, 1997)}...` : message;
    await prisma.site
      .update({
        where: { id: siteId },
        data: { lastBuildError: truncated },
      })
      .catch(() => {});
    throw error;
  }
}

async function runBuild(siteId: string): Promise<string> {
  const site = await prisma.site.findUniqueOrThrow({
    where: { id: siteId },
    include: { user: true },
  });
  const subdomain = normalizeSiteSubdomain(site.subdomain);
  if (!subdomain) {
    throw new Error(`Invalid site subdomain "${site.subdomain}".`);
  }

  const client = new ArenaClient(site.user.arenaToken);
  const channel = await client.getChannel(site.channelSlug);
  const blocks = await client.getAllChannelBlocks(site.channelSlug);
  const channelCss = extractChannelStylesCss(blocks);
  const effectiveCustomCss = resolveSiteCustomCss(site.customCss, channelCss);
  const templateCustomCss = escapeStyleTagContent(effectiveCustomCss);

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (!(await isKnownTemplateSlug(site.template))) {
    throw new Error(`Unknown template "${site.template}".`);
  }

  let siteData: SiteData = {
    channel: arenaChannelToSiteDataChannel(channel),
    blocks: channelBlocksForTemplate(blocks),
    site: {
      subdomain,
      url: `${protocol}://${subdomain}.${siteDomain}`,
      template: site.template,
      custom_css: templateCustomCss,
      built_at: new Date().toISOString(),
    },
  };
  siteData = enrichFeatureRequestSiteData(siteData);

  // Load template
  const templateDir = path.join(process.cwd(), "templates", site.template);
  const templateSource = await fs.readFile(
    path.join(templateDir, "index.hbs"),
    "utf-8"
  );
  const styleContent = await fs.readFile(
    path.join(templateDir, "style.css"),
    "utf-8"
  ).catch(() => "");

  // Check for block partial
  const blockPartialSource = await fs.readFile(
    path.join(templateDir, "block.hbs"),
    "utf-8"
  ).catch(() => null);

  if (blockPartialSource) {
    Handlebars.registerPartial("block", blockPartialSource);
  }

  // Build theme override CSS from saved colors/fonts
  let themeOverrideCss = "";
  if (site.themeColors) {
    try {
      const c = JSON.parse(site.themeColors);
      themeOverrideCss += `:root { --color-bg: ${c.background}; --color-text: ${c.text}; --color-accent: ${c.accent}; --color-border: ${c.border}; }\n`;
      themeOverrideCss += `body { background-color: ${c.background}; color: ${c.text}; }\n`;
      themeOverrideCss += `a { color: ${c.accent}; }\n`;
    } catch {}
  }
  let themeFontLinks = "";
  if (site.themeFonts) {
    try {
      const f = JSON.parse(site.themeFonts);
      const heading = f.heading || "system";
      const body = f.body || "system";
      themeOverrideCss += `:root {
  --tg-font-heading: ${fontFamilyCSS(heading)};
  --tg-font-body: ${fontFamilyCSS(body)};
}
`;
      if (f.heading && f.heading !== "system") {
        themeOverrideCss += `h1, h2, h3, h4, h5, h6 { font-family: ${fontFamilyCSS(f.heading)}; }\n`;
      }
      if (f.body && f.body !== "system") {
        themeOverrideCss += `body { font-family: ${fontFamilyCSS(f.body)}; }\n`;
      }
      // Google Fonts link tags
      themeFontLinks = googleFontsLinkTag([f.heading, f.body].filter(Boolean));
    } catch {}
  }

  const iconSeed = site.iconSeed ?? seedFromSubdomain(subdomain);
  const faviconURI = generatePlantDataURI(iconSeed);
  const plantSVGInline = generatePlantSVG(iconSeed).replace(/"/g, "'");
  const gardenFooter = `<footer style="margin-top:3rem;padding:1rem 0;border-top:1px solid #e5e5e5;text-align:center;font-size:11px;color:#999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <a href="https://tiny.garden" target="_blank" rel="noopener" style="color:#999;text-decoration:none;display:inline-flex;align-items:center;gap:4px">
    <span style="display:inline-block;width:16px;height:16px">${plantSVGInline}</span>
    made with tiny.garden
  </a>
</footer>`;

  const template = Handlebars.compile(templateSource);
  let html = template({ ...siteData, styles: styleContent });
  html = applyStaticPageFinishes(html, {
    styleContent,
    faviconURI,
    gardenFooter,
    themeFontLinks,
    themeOverrideCss,
    effectiveCustomCss,
  });

  const blobSitePrefix = `users/${site.user.arenaUsername}/sites/${subdomain}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tiny.garden";

  // Upload to Vercel Blob if token available, otherwise write to filesystem
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    // Download all assets and upload to blob storage
    const blobPath = `users/${site.user.arenaUsername}/sites/${subdomain}/assets`;
    const assetMap = await processAssets(
      siteData.blocks,
      siteData.channel.user.avatar_url,
      blobPath,
      blobToken
    );

    // Rewrite all Are.na CDN URLs to our proxied blob URLs
    if (assetMap.size > 0) {
      html = rewriteUrls(html, assetMap, appUrl);
    }

    await emitDirectoryBlockPages({
      siteTemplate: site.template,
      templateDir,
      siteData,
      styleContent,
      faviconURI,
      gardenFooter,
      themeFontLinks,
      themeOverrideCss,
      effectiveCustomCss,
      assetMap,
      appUrl,
      blobToken,
      blobSitePrefix,
      outputDir: null,
    });
    await emitFeatureRequestsBlockPages({
      siteTemplate: site.template,
      templateDir,
      siteData,
      styleContent,
      faviconURI,
      gardenFooter,
      themeFontLinks,
      themeOverrideCss,
      effectiveCustomCss,
      assetMap,
      appUrl,
      blobToken,
      blobSitePrefix,
      outputDir: null,
    });

    const blob = await put(`${blobSitePrefix}/index.html`, html, {
      access: "private",
      contentType: "text/html",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blobToken,
    });

    await prisma.site.update({
      where: { id: siteId },
      data: {
        lastBuiltAt: new Date(),
        published: true,
        blobUrl: blob.url,
        lastBuildError: null,
      },
    });

    return blob.url;
  } else {
    // Use /tmp on Vercel (read-only fs), or generated/ locally
    const base = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "generated");
    const outputDir = path.join(base, subdomain);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, "index.html"), html);

    const emptyAssets: AssetMap = new Map();
    await emitDirectoryBlockPages({
      siteTemplate: site.template,
      templateDir,
      siteData,
      styleContent,
      faviconURI,
      gardenFooter,
      themeFontLinks,
      themeOverrideCss,
      effectiveCustomCss,
      assetMap: emptyAssets,
      appUrl,
      blobToken: undefined,
      blobSitePrefix,
      outputDir,
    });
    await emitFeatureRequestsBlockPages({
      siteTemplate: site.template,
      templateDir,
      siteData,
      styleContent,
      faviconURI,
      gardenFooter,
      themeFontLinks,
      themeOverrideCss,
      effectiveCustomCss,
      assetMap: emptyAssets,
      appUrl,
      blobToken: undefined,
      blobSitePrefix,
      outputDir,
    });

    await prisma.site.update({
      where: { id: siteId },
      data: {
        lastBuiltAt: new Date(),
        published: true,
        lastBuildError: null,
      },
    });

    return outputDir;
  }
}
