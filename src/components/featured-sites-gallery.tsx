import { ArrowUpRight } from "lucide-react";
import { templateDisplayNameFallback } from "@/lib/template-display-names";

export type FeaturedSiteForGallery = {
  id: string;
  subdomain: string;
  channelTitle: string;
  template: string;
};

const PLACEHOLDER_SITES: {
  title: string;
  desc: string;
  subdomain: string;
  template: string;
}[] = [
  {
    title: "Field Notes",
    desc: "Research and observations",
    subdomain: "field-notes",
    template: "blog",
  },
  {
    title: "Visual References",
    desc: "Collected imagery and inspiration",
    subdomain: "visual-refs",
    template: "feed",
  },
  {
    title: "Reading List",
    desc: "Articles, essays, and books",
    subdomain: "reading-list",
    template: "document",
  },
  {
    title: "Studio Archive",
    desc: "Work in progress and documentation",
    subdomain: "studio-archive",
    template: "portfolio",
  },
];

function labelFor(
  templateSlug: string,
  templateNames: Record<string, string>
): string {
  return (
    templateNames[templateSlug] ?? templateDisplayNameFallback(templateSlug)
  );
}

export function FeaturedSitesGallery({
  sites,
  templateNames,
}: {
  sites: FeaturedSiteForGallery[];
  templateNames: Record<string, string>;
}) {
  const hasLive = sites.length > 0;

  return (
    <section className="max-w-6xl mx-auto px-4 py-20 border-t border-neutral-100">
      <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6 md:mb-10">
        Featured sites
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {hasLive
          ? sites.map((site) => {
              const templateLabel = labelFor(site.template, templateNames);
              return (
                <a
                  key={site.id}
                  href={`/api/serve/${site.subdomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${site.channelTitle}, ${templateLabel} template — open site in a new tab`}
                  className="group flex flex-col min-h-0"
                >
                  <div className="relative w-full overflow-hidden bg-neutral-100 aspect-[3/4]">
                    <iframe
                      src={`/api/serve/${site.subdomain}`}
                      className="absolute inset-0 w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                      tabIndex={-1}
                      title={`Preview of ${site.channelTitle}`}
                    />
                    <span
                      className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06] transition-[box-shadow] group-hover:ring-black/[0.12]"
                      aria-hidden
                    />
                    <span
                      className="pointer-events-none absolute top-2 right-2 z-10 inline-flex rounded-md bg-white/90 p-1.5 text-neutral-800 opacity-0 shadow-sm ring-1 ring-black/[0.06] transition-opacity duration-200 group-hover:opacity-100"
                      aria-hidden
                    >
                      <ArrowUpRight
                        className="size-3.5 shrink-0"
                        strokeWidth={2}
                      />
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-2.5 pr-1 min-w-0">
                    <p className="text-[13px] sm:text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
                      {site.channelTitle}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mt-1">
                      {templateLabel}
                    </p>
                  </div>
                </a>
              );
            })
          : PLACEHOLDER_SITES.map((site) => {
              const templateLabel = labelFor(site.template, templateNames);
              return (
                <div key={site.subdomain} className="flex flex-col min-h-0">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-50 flex items-center justify-center">
                    <span className="text-[11px] text-neutral-300 px-3 text-center leading-relaxed">
                      {site.subdomain}.tiny.garden
                    </span>
                    <span
                      className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05]"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-2 sm:mt-2.5 pr-1 min-w-0">
                    <p className="text-[13px] sm:text-sm font-medium text-neutral-900 leading-snug">
                      {site.title}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug line-clamp-2">
                      {site.desc}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mt-1">
                      {templateLabel}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}
