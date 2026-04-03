import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SITE_CARD_GRID_CLASS } from "@/lib/site-card-grid";
import { loadTemplatesFromDisk } from "@/lib/templates-manifest";

export default async function TemplatesPage() {
  const rows = await loadTemplatesFromDisk();

  return (
    <main className="min-h-screen w-full min-w-0 max-w-4xl mx-auto px-4 py-16 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-12">
        <div>
          <h1 className="text-lg font-medium text-neutral-950 dark:text-neutral-50">Templates</h1>
          <p className="text-xs text-neutral-400 mt-1 dark:text-neutral-500">
            Preview each template with sample Are.na content. Click the preview or Open for full-screen.
          </p>
        </div>
        <Link
          href="/#templates"
          className="inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/80 dark:border-neutral-700"
        >
          Back to home
        </Link>
      </div>

      <div className={SITE_CARD_GRID_CLASS}>
        {rows.map((t) => {
          const previewUrl = `/api/templates/preview?template=${t.id}`;
          return (
            <div
              key={t.id}
              className="group/card border rounded overflow-hidden border-neutral-200 dark:border-neutral-700"
            >
              <div className="relative">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener"
                  className="block bg-neutral-50 group/preview cursor-pointer dark:bg-neutral-900"
                >
                  <div className="aspect-[16/9] overflow-hidden relative">
                    <iframe
                      src={previewUrl}
                      className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                      tabIndex={-1}
                      title={`Preview of ${t.name}`}
                    />
                    <div className="absolute inset-0 z-10 bg-transparent group-hover/preview:bg-black/5 transition-colors pointer-events-none">
                      <span className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white/90 dark:bg-neutral-900/90 backdrop-blur px-2 py-1 rounded-md opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-sm border border-neutral-200/80 dark:border-neutral-700/80">
                        Open preview
                        <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      </span>
                    </div>
                  </div>
                </a>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium truncate text-neutral-950 dark:text-neutral-50">{t.name}</p>
                    <p className="text-xs text-neutral-400 line-clamp-2 dark:text-neutral-500">{t.description}</p>
                  </div>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener"
                    className="text-xs px-2.5 py-1 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors shrink-0 dark:hover:bg-neutral-800/80 dark:border-neutral-700"
                  >
                    Open
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
