import { NextRequest, NextResponse } from "next/server";
import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import { MOCK_SITE_DATA } from "@/lib/mock-data";

// Register helper once
Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

export async function GET(request: NextRequest) {
  const template = request.nextUrl.searchParams.get("template");
  if (!template) {
    return NextResponse.json(
      { error: "Missing ?template= param" },
      { status: 400 }
    );
  }

  // Optional theme overrides via query params
  const bg = request.nextUrl.searchParams.get("bg");
  const text = request.nextUrl.searchParams.get("text");
  const accent = request.nextUrl.searchParams.get("accent");
  const border = request.nextUrl.searchParams.get("border");
  const headingFont = request.nextUrl.searchParams.get("headingFont");
  const bodyFont = request.nextUrl.searchParams.get("bodyFont");

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

    // Inline the CSS so previews work without a separate style.css endpoint
    const inlinedSource = templateSource.replace(
      /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/i,
      `<style>${styleContent}</style>`
    );

    // Build theme override CSS if any params provided
    const fontMap: Record<string, string> = {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      inter: '"Inter", sans-serif',
      georgia: '"Georgia", serif',
      menlo: '"Menlo", "Consolas", monospace',
      palatino: '"Palatino Linotype", "Palatino", serif',
      helvetica: '"Helvetica Neue", "Helvetica", sans-serif',
    };

    let themeCSS = "";
    const hasTheme = bg || text || accent || border || headingFont || bodyFont;
    if (hasTheme) {
      themeCSS = `<style>
        :root {
          ${bg ? `--color-background: ${bg};` : ""}
          ${text ? `--color-text: ${text};` : ""}
          ${accent ? `--color-accent: ${accent};` : ""}
          ${border ? `--color-border: ${border};` : ""}
          ${headingFont ? `--font-heading: ${fontMap[headingFont] || fontMap.system};` : ""}
          ${bodyFont ? `--font-body: ${fontMap[bodyFont] || fontMap.system};` : ""}
        }
        ${bg ? `body { background-color: ${bg} !important; }` : ""}
        ${text ? `body { color: ${text} !important; }` : ""}
        ${headingFont ? `h1, h2, h3, h4, h5, h6 { font-family: ${fontMap[headingFont] || fontMap.system} !important; }` : ""}
        ${bodyFont ? `body, p, span, li, td { font-family: ${fontMap[bodyFont] || fontMap.system} !important; }` : ""}
        ${accent ? `a { color: ${accent} !important; }` : ""}
        ${border ? `hr, .border, [class*="border"] { border-color: ${border} !important; }` : ""}
      </style>`;
    }

    const compiledTemplate = Handlebars.compile(inlinedSource);
    const siteData = {
      ...MOCK_SITE_DATA,
      site: { ...MOCK_SITE_DATA.site, template },
    };
    let html = compiledTemplate({ ...siteData, styles: styleContent });

    // Inject theme overrides before closing </head> or at end
    if (themeCSS) {
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${themeCSS}</head>`);
      } else {
        html = themeCSS + html;
      }
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { error: `Template "${template}" not found` },
      { status: 404 }
    );
  }
}
