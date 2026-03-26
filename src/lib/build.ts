import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { ArenaClient, ArenaBlock } from "./arena";
import { prisma } from "./db";

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
    normalized.content = block.content_html;
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

  const template = Handlebars.compile(templateSource);
  let html = template({ ...siteData, styles: styleContent });

  // Inline the stylesheet so the single-file serve works without relative paths
  if (styleContent) {
    html = html.replace(
      /<link[^>]*rel=["']stylesheet["'][^>]*href=["']style\.css["'][^>]*\/?>/i,
      `<style>${styleContent}</style>`
    );
  }

  // Upload to Vercel Blob (production) or write to filesystem (dev)
  const isVercel = !!process.env.BLOB_READ_WRITE_TOKEN;

  if (isVercel) {
    const blob = await put(`sites/${site.subdomain}/index.html`, html, {
      access: "public",
      contentType: "text/html",
      addRandomSuffix: false,
    });

    await prisma.site.update({
      where: { id: siteId },
      data: { lastBuiltAt: new Date(), published: true, blobUrl: blob.url },
    });

    return blob.url;
  } else {
    const outputDir = path.join(process.cwd(), "generated", site.subdomain);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, "index.html"), html);

    await prisma.site.update({
      where: { id: siteId },
      data: { lastBuiltAt: new Date(), published: true },
    });

    return outputDir;
  }
}
