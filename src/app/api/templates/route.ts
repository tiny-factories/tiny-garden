import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  const templatesDir = path.join(process.cwd(), "templates");

  try {
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });
    const templates = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const metaPath = path.join(templatesDir, entry.name, "meta.json");
        const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
        templates.push({
          id: entry.name,
          name: meta.name || entry.name,
          description: meta.description || "",
        });
      } catch {
        // Skip templates without meta.json
      }
    }

    return NextResponse.json(templates);
  } catch {
    return NextResponse.json([]);
  }
}
