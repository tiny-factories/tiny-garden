import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { ArenaClient, ArenaBlock } from "./arena";
import { prisma } from "./db";
import { fontFamilyCSS, googleFontsLinkTag } from "./fonts";

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
  };
  source_url: string | null;
  comment_count: number;
  arena_url: string;
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

    normalized.image = { original, large, square, display };
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
    normalized.attachment = {
      url: block.attachment.url,
      file_name: block.attachment.file_name,
      file_size: block.attachment.file_size,
      content_type: block.attachment.content_type,
    };
    normalized.source_url = block.attachment.url;
  }

  return normalized;
}

Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper("gt", (a: unknown, b: unknown) => Number(a) > Number(b));
Handlebars.registerHelper("formatDate", (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
});

export async function buildSite(siteId: string): Promise<string> {
  const site = await prisma.site.findUniqueOrThrow({
    where: { id: siteId },
    include: { user: true },
  });

  const client = new ArenaClient(site.user.arenaToken);
  const channel = await client.getChannel(site.channelSlug);
  const blocks = await client.getAllChannelBlocks(site.channelSlug);

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  const siteData: SiteData = {
    channel: {
      title: channel.title,
      slug: channel.slug,
      description: typeof channel.description === "string" ? channel.description : "",
      user: {
        name: channel.owner?.name || channel.owner?.full_name || channel.owner?.username || channel.user?.full_name || "",
        slug: channel.owner?.slug || channel.user?.slug || "",
        avatar_url: channel.owner?.avatar || channel.owner?.avatar_image?.display || channel.user?.avatar_image?.display || "",
      },
      created_at: channel.created_at,
      updated_at: channel.updated_at,
      length: channel.length || channel.counts?.contents || 0,
    },
    blocks: blocks.map(normalizeBlock),
    site: {
      subdomain: site.subdomain,
      url: `${protocol}://${site.subdomain}.${siteDomain}`,
      template: site.template,
      custom_css: site.customCss || "",
      built_at: new Date().toISOString(),
    },
  };

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

  const template = Handlebars.compile(templateSource);
  let html = template({ ...siteData, styles: styleContent });

  // Inline the stylesheet so the single-file serve works without relative paths
  if (styleContent) {
    html = html.replace(
      /<link[^>]*rel=["']stylesheet["'][^>]*href=["']style\.css["'][^>]*\/?>/i,
      `<style>${styleContent}</style>`
    );
  }

  // Inject Google Fonts links + theme overrides before </head>
  const themeInjection = themeFontLinks + (themeOverrideCss ? `<style>${themeOverrideCss}</style>\n` : "");
  if (themeInjection) {
    html = html.replace("</head>", `${themeInjection}</head>`);
  }

  // Upload to Vercel Blob if token available, otherwise write to filesystem
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    // Download all assets and upload to blob storage
    const blobPath = `users/${site.user.arenaUsername}/sites/${site.subdomain}/assets`;
    const assetMap = await processAssets(
      siteData.blocks,
      siteData.channel.user.avatar_url,
      blobPath,
      blobToken
    );

    // Rewrite all Are.na CDN URLs to our proxied blob URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tiny.garden";
    if (assetMap.size > 0) {
      html = rewriteUrls(html, assetMap, appUrl);
    }

    const blob = await put(`users/${site.user.arenaUsername}/sites/${site.subdomain}/index.html`, html, {
      access: "private",
      contentType: "text/html",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blobToken,
    });

    await prisma.site.update({
      where: { id: siteId },
      data: { lastBuiltAt: new Date(), published: true, blobUrl: blob.url },
    });

    return blob.url;
  } else {
    // Use /tmp on Vercel (read-only fs), or generated/ locally
    const base = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "generated");
    const outputDir = path.join(base, site.subdomain);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, "index.html"), html);

    await prisma.site.update({
      where: { id: siteId },
      data: { lastBuiltAt: new Date(), published: true },
    });

    return outputDir;
  }
}
