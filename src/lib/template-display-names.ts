import fs from "fs/promises";
import path from "path";

/** Slug → marketing name from each template’s meta.json. */
export async function getTemplateDisplayNames(): Promise<Record<string, string>> {
  const templatesDir = path.join(process.cwd(), "templates");
  const entries = await fs.readdir(templatesDir, { withFileTypes: true });
  const map: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await fs.readFile(
        path.join(templatesDir, entry.name, "meta.json"),
        "utf-8"
      );
      const meta = JSON.parse(raw) as { name?: string };
      if (typeof meta.name === "string") {
        map[entry.name] = meta.name;
      }
    } catch {
      // skip
    }
  }
  return map;
}

export function templateDisplayNameFallback(slug: string): string {
  if (!slug) return "Template";
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
