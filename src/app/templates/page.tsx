import Link from "next/link";
import fs from "fs/promises";
import path from "path";

interface TemplateMeta {
  name: string;
  description: string;
  slug: string;
}

async function getTemplates(): Promise<TemplateMeta[]> {
  const templatesDir = path.join(process.cwd(), "templates");
  const entries = await fs.readdir(templatesDir, { withFileTypes: true });
  const templates: TemplateMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const meta = JSON.parse(
        await fs.readFile(path.join(templatesDir, entry.name, "meta.json"), "utf-8")
      );
      templates.push({ ...meta, slug: entry.name });
    } catch {
      // skip directories without meta.json
    }
  }

  return templates;
}

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-sans">
      <header className="flex flex-col gap-4 border-b border-neutral-200 px-8 pb-6 pt-8 sm:flex-row sm:items-start sm:justify-between dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">Templates</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Preview each template with sample Are.na content. Click to view full-screen.
          </p>
        </div>
        <Link
          href="/#templates"
          className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          Back to home
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-8 p-8 [grid-template-columns:repeat(auto-fill,minmax(560px,1fr))]">
        {templates.map((t) => (
          <div
            key={t.slug}
            className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t.name}</span>
                <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">{t.description}</span>
              </div>
              <a
                href={`/api/templates/preview?template=${t.slug}`}
                target="_blank"
                rel="noopener"
                className="inline-flex shrink-0 items-center rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-white dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-950"
              >
                Open
              </a>
            </div>
            <iframe
              src={`/api/templates/preview?template=${t.slug}`}
              className="block h-[500px] w-full border-0 bg-white dark:bg-neutral-950"
              title={`${t.name} preview`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
