import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { templateDisplayNameFallback } from "@/lib/template-display-name-fallback";

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

type Live = FeaturedSiteForGallery;
type Ph = (typeof PLACEHOLDER_SITES)[number];

function bentoCellClass(index: number, total: number): string {
  if (total <= 1) {
    return "md:col-span-4";
  }
  if (total === 2) {
    return index === 0
      ? "md:col-span-2 md:row-span-2"
      : "md:col-span-2 md:row-span-2 md:col-start-3";
  }
  if (total === 3) {
    if (index === 0) return "md:col-span-2 md:row-span-2";
    if (index === 1) return "md:col-span-2 md:col-start-3 md:row-start-1";
    return "md:col-span-2 md:col-start-3 md:row-start-2";
  }
  if (index === 0) return "md:col-span-2 md:row-span-2";
  if (index === 1) return "md:col-span-1 md:col-start-3 md:row-start-1";
  if (index === 2) return "md:col-span-1 md:col-start-4 md:row-start-1";
  if (index === 3) return "md:col-span-2 md:col-start-3 md:row-start-2";
  return "";
}

function FeaturedLiveCard({
  site,
  templateLabel,
  variant,
}: {
  site: Live;
  templateLabel: string;
  variant: "hero" | "compact";
}) {
  const titleClass =
    variant === "hero"
      ? "line-clamp-2 text-sm font-medium leading-snug text-neutral-900 dark:text-neutral-100 sm:text-base"
      : "line-clamp-2 text-[13px] font-medium leading-snug text-neutral-900 dark:text-neutral-100 sm:text-sm";
  const metaClass =
    variant === "hero"
      ? "mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 sm:text-xs"
      : "mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500";

  return (
    <Link
      href={`/api/serve/${site.subdomain}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${site.channelTitle}, ${templateLabel} template — open site in a new tab`}
      className="group flex min-h-0 w-full flex-col"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
        <iframe
          src={`/api/serve/${site.subdomain}`}
          className="pointer-events-none absolute inset-0 h-[200%] w-[200%] origin-top-left scale-50"
          tabIndex={-1}
          title={`Preview of ${site.channelTitle}`}
        />
        <span
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] transition-[box-shadow] group-hover:ring-black/[0.12] dark:group-hover:ring-white/[0.14]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute right-2 top-2 z-10 inline-flex rounded-md bg-white/90 p-1.5 text-neutral-800 opacity-0 shadow-sm ring-1 ring-black/[0.06] transition-opacity duration-200 group-hover:opacity-100 dark:bg-neutral-900/90 dark:text-neutral-200 dark:ring-white/[0.1]"
          aria-hidden
        >
          <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-2.5 min-w-0 pr-1 sm:mt-3">
        <p className={titleClass}>{site.channelTitle}</p>
        <p className={metaClass}>{templateLabel}</p>
      </div>
    </Link>
  );
}

function FeaturedPlaceholderCard({
  site,
  templateLabel,
  variant,
}: {
  site: Ph;
  templateLabel: string;
  variant: "hero" | "compact";
}) {
  const titleClass =
    variant === "hero"
      ? "text-sm font-medium leading-snug text-neutral-900 dark:text-neutral-100 sm:text-base"
      : "text-[13px] font-medium leading-snug text-neutral-900 dark:text-neutral-100 sm:text-sm";
  const metaClass =
    variant === "hero"
      ? "mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 sm:text-xs"
      : "mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500";

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
        <span className="px-3 text-center text-[11px] leading-relaxed text-neutral-300 dark:text-neutral-600 sm:text-xs">
          {site.subdomain}.tiny.garden
        </span>
        <span
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05] dark:ring-white/[0.08]"
          aria-hidden
        />
      </div>
      <div className="mt-2.5 min-w-0 pr-1 sm:mt-3">
        <p className={titleClass}>{site.title}</p>
        <p
          className={
            variant === "hero"
              ? "mt-0.5 line-clamp-2 text-xs leading-snug text-neutral-400 dark:text-neutral-500 sm:text-[13px]"
              : "mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500"
          }
        >
          {site.desc}
        </p>
        <p className={metaClass}>{templateLabel}</p>
      </div>
    </div>
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
  const items: (Live | Ph)[] = hasLive ? sites : PLACEHOLDER_SITES;
  const total = items.length;

  const bentoItems = items.slice(0, 4);
  const restItems = items.slice(4);

  const renderCard = (item: Live | Ph, index: number) => {
    const variant: "hero" | "compact" = index === 0 ? "hero" : "compact";
    if (hasLive && "id" in item) {
      return (
        <FeaturedLiveCard
          site={item}
          templateLabel={labelFor(item.template, templateNames)}
          variant={variant}
        />
      );
    }
    const ph = item as Ph;
    return (
      <FeaturedPlaceholderCard
        site={ph}
        templateLabel={labelFor(ph.template, templateNames)}
        variant={variant}
      />
    );
  };

  return (
    <section className="border-t border-neutral-100 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto mb-8 max-w-3xl px-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Featured sites
        </h2>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div
          className={
            total > 1
              ? "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-4 md:grid-rows-2 md:gap-4 lg:gap-5"
              : "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-4"
          }
        >
          {bentoItems.map((item, i) => (
            <div
              key={
                hasLive && "id" in item
                  ? item.id
                  : `${(item as Ph).subdomain}-${i}`
              }
              className={`min-w-0 ${bentoCellClass(i, total)}`}
            >
              {renderCard(item, i)}
            </div>
          ))}
        </div>

        {restItems.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:mt-5 md:grid-cols-4 md:gap-4 lg:gap-5">
            {restItems.map((item, i) => (
              <div
                key={
                  hasLive && "id" in item
                    ? item.id
                    : `${(item as Ph).subdomain}-more-${i}`
                }
                className="min-w-0"
              >
                {renderCard(item, i + 4)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
