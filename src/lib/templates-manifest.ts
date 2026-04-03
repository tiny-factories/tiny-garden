import fs from "fs/promises";
import path from "path";

export interface TemplateListItem {
  id: string;
  name: string;
  description: string;
}

/**
 * All template folders that include meta.json, sorted by display name.
 * Used by /api/templates, the /templates preview page, and validation on site create/update.
 */
export async function loadTemplatesFromDisk(): Promise<TemplateListItem[]> {
  const templatesDir = path.join(process.cwd(), "templates");

  try {
    const entries = await fs.readdir(templatesDir, { withFileTypes: true });
    const templates: TemplateListItem[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const metaPath = path.join(templatesDir, entry.name, "meta.json");
        const meta = JSON.parse(await fs.readFile(metaPath, "utf-8")) as {
          name?: string;
          description?: string;
        };
        templates.push({
          id: entry.name,
          name: typeof meta.name === "string" ? meta.name : entry.name,
          description: typeof meta.description === "string" ? meta.description : "",
        });
      } catch {
        // skip directories without readable meta.json
      }
    }

    templates.sort((a, b) => a.name.localeCompare(b.name, "en"));
    return templates;
  } catch {
    return [];
  }
}

export async function isKnownTemplateSlug(slug: string): Promise<boolean> {
  if (!slug || typeof slug !== "string") return false;
  const list = await loadTemplatesFromDisk();
  return list.some((t) => t.id === slug);
}
