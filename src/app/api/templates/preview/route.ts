import { NextRequest, NextResponse } from "next/server";
import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import { ArenaClient } from "@/lib/arena";
import { MOCK_SITE_DATA } from "@/lib/mock-data";
import {
  arenaChannelToSiteDataChannel,
  channelBlocksForTemplate,
  finderOpenUrl,
  finderThumbContain,
  finderThumbUrl,
  type TemplateBlock,
} from "@/lib/build";
import {
  extractChannelStylesCss,
  isReservedStylesCssTitle,
  resolveSiteCustomCss,
} from "@/lib/channel-styles";
import { fontFamilyCSS, googleFontsLinkTag } from "@/lib/fonts";
import { prisma } from "@/lib/db";
import { getRequestAuth } from "@/lib/request-auth";
import { isKnownTemplateSlug } from "@/lib/templates-manifest";
import { getArenaTokenForTemplateExamples } from "@/lib/template-example-token";
import { registerFeatureRequestHandlebarsHelpers } from "@/lib/feature-request-status";
import {
  enrichFeatureRequestSiteData,
  registerFeatureRequestRowHelpers,
} from "@/lib/feature-request-tags";

const MAX_PREVIEW_CUSTOM_CSS = 60_000;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** Avoid breaking out of &lt;style&gt; when previewing unsaved CSS. */
function stripUnsafeForStyleInjection(css: string): string {
  return css.replace(/</g, "");
}

// Register helpers (keep in sync with src/lib/build.ts)
Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper("gt", (a: unknown, b: unknown) => Number(a) > Number(b));
registerFeatureRequestHandlebarsHelpers(Handlebars);
registerFeatureRequestRowHelpers(Handlebars);
Handlebars.registerHelper("isReservedStylesCssTitle", (title: unknown) =>
  typeof title === "string" && isReservedStylesCssTitle(title)
);
Handlebars.registerHelper("formatDate", (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
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

export type TemplatePreviewInput = {
  template: string;
  bg?: string | null;
  text?: string | null;
  accent?: string | null;
  border?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  siteId?: string | null;
  /** Unsaved layout CSS (e.g. AI draft) — injected after channel/site CSS */
  previewCustomCss?: string | null;
};

async function buildPreviewResponse(
  request: NextRequest,
  {
    template,
    bg,
    text,
    accent,
    border,
    headingFont,
    bodyFont,
    siteId,
    previewCustomCss,
  }: TemplatePreviewInput
): Promise<NextResponse> {
  const templateDir = path.join(process.cwd(), "templates", template);

  try {
    const [templateSource, styleContent, blockPartialSource] =
      await Promise.all([
        fs.readFile(path.join(templateDir, "index.hbs"), "utf-8"),
        fs.readFile(path.join(templateDir, "style.css"), "utf-8").catch(
          () => ""
        ),
        fs.readFile(path.join(templateDir, "block.hbs"), "utf-8").catch(
          () => null
        ),
      ]);

    if (blockPartialSource) {
      Handlebars.registerPartial("block", blockPartialSource);
    }

    const inlinedSource = templateSource.replace(
      /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/i,
      `<style>${styleContent}</style>`
    );

    const hasTheme = bg || text || accent || border || headingFont || bodyFont;
    let themeCSS = "";
    let fontLinks = "";

    if (hasTheme) {
      const fontValues = [headingFont, bodyFont].filter(Boolean) as string[];
      fontLinks = googleFontsLinkTag(fontValues);

      const headingCSS = headingFont ? fontFamilyCSS(headingFont) : null;
      const bodyCSS = bodyFont ? fontFamilyCSS(bodyFont) : null;

      themeCSS = `<style>
        :root {
          ${bg ? `--color-bg: ${bg}; --color-background: ${bg};` : ""}
          ${text ? `--color-text: ${text};` : ""}
          ${accent ? `--color-accent: ${accent};` : ""}
          ${border ? `--color-border: ${border};` : ""}
          ${headingCSS ? `--tg-font-heading: ${headingCSS};` : ""}
          ${bodyCSS ? `--tg-font-body: ${bodyCSS};` : ""}
          ${headingCSS ? `--font-heading: ${headingCSS};` : ""}
          ${bodyCSS ? `--font-body: ${bodyCSS};` : ""}
        }
        ${bg ? `body { background-color: ${bg} !important; }` : ""}
        ${text ? `body { color: ${text} !important; }` : ""}
        ${headingCSS ? `h1, h2, h3, h4, h5, h6 { font-family: ${headingCSS} !important; }` : ""}
        ${bodyCSS ? `body, p, span, li, td { font-family: ${bodyCSS} !important; }` : ""}
        ${accent ? `a { color: ${accent} !important; }` : ""}
        ${border ? `hr, .border, [class*="border"] { border-color: ${border} !important; }` : ""}
      </style>`;
    }

    let previewChannel = MOCK_SITE_DATA.channel;
    let previewBlocks = MOCK_SITE_DATA.blocks;
    let siteHead = "";
    let ownerCustomCss = "";
    let filledPreviewFromSite = false;

    if (siteId) {
      const auth = await getRequestAuth(request);
      const site = await prisma.site.findUnique({
        where: { id: siteId },
        select: {
          id: true,
          channelTitle: true,
          channelSlug: true,
          customCss: true,
          userId: true,
          user: { select: { arenaToken: true } },
        },
      });
      if (site) {
        if (auth && site.userId === auth.userId) {
          try {
            const client = new ArenaClient(site.user.arenaToken);
            const [arenaChannel, arenaBlocks] = await Promise.all([
              client.getChannel(site.channelSlug),
              client.getAllChannelBlocks(site.channelSlug),
            ]);
            previewChannel = arenaChannelToSiteDataChannel(arenaChannel);
            previewBlocks = channelBlocksForTemplate(arenaBlocks);
            filledPreviewFromSite = true;
            const channelCss = extractChannelStylesCss(arenaBlocks);
            const effectiveCss = resolveSiteCustomCss(
              site.customCss,
              channelCss
            );
            if (effectiveCss) {
              ownerCustomCss = `<style id="tiny-garden-site-css">\n${effectiveCss}\n</style>`;
            }
          } catch {
            /* mock channel/blocks; preview still works */
          }
        }
        const origin = request.nextUrl.origin;
        const iconUrl = new URL(`/api/sites/${site.id}/icon`, origin).href;
        const pageUrl = request.nextUrl.toString();
        const title = escapeHtmlAttr(site.channelTitle);
        const desc = escapeHtmlAttr(`${site.channelTitle} — a tiny.garden site`);
        siteHead = `
<link rel="icon" type="image/svg+xml" href="${escapeHtmlAttr(iconUrl)}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:image" content="${escapeHtmlAttr(iconUrl)}" />
<meta property="og:url" content="${escapeHtmlAttr(pageUrl)}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${escapeHtmlAttr(iconUrl)}" />
`;
      }
    }

    if (!filledPreviewFromSite) {
      const [exampleRow, exampleToken] = await Promise.all([
        prisma.templateExampleChannel.findUnique({
          where: { templateSlug: template },
        }),
        getArenaTokenForTemplateExamples(),
      ]);
      if (exampleRow?.channelSlug && exampleToken) {
        try {
          const client = new ArenaClient(exampleToken);
          const slug = exampleRow.channelSlug;
          const [arenaChannel, arenaBlocks] = await Promise.all([
            client.getChannel(slug),
            client.getAllChannelBlocks(slug),
          ]);
          previewChannel = arenaChannelToSiteDataChannel(arenaChannel);
          previewBlocks = channelBlocksForTemplate(arenaBlocks);
          const channelCss = extractChannelStylesCss(arenaBlocks);
          const effectiveCss = resolveSiteCustomCss(null, channelCss);
          if (effectiveCss) {
            ownerCustomCss = `<style id="tiny-garden-site-css">\n${effectiveCss}\n</style>`;
          }
        } catch {
          /* keep mock */
        }
      }
    }

    let previewInlineCss = "";
    if (previewCustomCss?.trim()) {
      const raw =
        previewCustomCss.length > MAX_PREVIEW_CUSTOM_CSS
          ? previewCustomCss.slice(0, MAX_PREVIEW_CUSTOM_CSS)
          : previewCustomCss;
      const safe = stripUnsafeForStyleInjection(raw);
      previewInlineCss = `<style id="tiny-garden-preview-custom">\n${safe}\n</style>`;
    }

    const compiledTemplate = Handlebars.compile(inlinedSource);
    const siteData = enrichFeatureRequestSiteData({
      channel: previewChannel,
      blocks: previewBlocks,
      site: { ...MOCK_SITE_DATA.site, template },
    });
    let html = compiledTemplate({ ...siteData, styles: styleContent });

    const injection =
      fontLinks + themeCSS + siteHead + ownerCustomCss + previewInlineCss;
    if (injection) {
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${injection}</head>`);
      } else {
        html = injection + html;
      }
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: `Template "${template}" not found` },
      { status: 404 }
    );
  }
}

export async function GET(request: NextRequest) {
  const template = request.nextUrl.searchParams.get("template");
  if (!template) {
    return NextResponse.json(
      { error: "Missing ?template= param" },
      { status: 400 }
    );
  }

  if (!(await isKnownTemplateSlug(template))) {
    return NextResponse.json(
      { error: `Template "${template}" not found` },
      { status: 404 }
    );
  }

  return buildPreviewResponse(request, {
    template,
    bg: request.nextUrl.searchParams.get("bg"),
    text: request.nextUrl.searchParams.get("text"),
    accent: request.nextUrl.searchParams.get("accent"),
    border: request.nextUrl.searchParams.get("border"),
    headingFont: request.nextUrl.searchParams.get("headingFont"),
    bodyFont: request.nextUrl.searchParams.get("bodyFont"),
    siteId: request.nextUrl.searchParams.get("siteId"),
    previewCustomCss: null,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const template = typeof o.template === "string" ? o.template.trim() : "";
  if (!template) {
    return NextResponse.json({ error: "Missing template" }, { status: 400 });
  }

  if (!(await isKnownTemplateSlug(template))) {
    return NextResponse.json(
      { error: `Template "${template}" not found` },
      { status: 404 }
    );
  }

  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  const previewCustomCss =
    typeof o.customCss === "string" ? o.customCss : null;

  return buildPreviewResponse(request, {
    template,
    bg: str(o.bg),
    text: str(o.text),
    accent: str(o.accent),
    border: str(o.border),
    headingFont: str(o.headingFont),
    bodyFont: str(o.bodyFont),
    siteId: str(o.siteId) ?? null,
    previewCustomCss,
  });
}
