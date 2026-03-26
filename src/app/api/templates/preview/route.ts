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

    const compiledTemplate = Handlebars.compile(inlinedSource);
    const siteData = {
      ...MOCK_SITE_DATA,
      site: { ...MOCK_SITE_DATA.site, template },
    };
    const html = compiledTemplate({ ...siteData, styles: styleContent });

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
