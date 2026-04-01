"use client";

import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
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

/** Duplicate column must stay interactive on first copy only. */
function nonTabbableCopy(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === Fragment) {
      return (
        <Fragment key={child.key}>
          {nonTabbableCopy(
            (child.props as { children?: ReactNode }).children,
          )}
        </Fragment>
      );
    }
    return cloneElement(child as ReactElement<{ tabIndex?: number }>, {
      tabIndex: -1,
    });
  });
}

function distributeIntoColumns<T>(items: T[], colCount: number): T[][] {
  const n = Math.max(1, Math.min(colCount, Math.max(items.length, 1)));
  const cols: T[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => {
    cols[i % n].push(item);
  });
  return cols;
}

type Live = FeaturedSiteForGallery;
type Ph = (typeof PLACEHOLDER_SITES)[number];

function FeaturedLiveCard({
  site,
  templateLabel,
}: {
  site: Live;
  templateLabel: string;
}) {
  return (
    <Link
      href={`/api/serve/${site.subdomain}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${site.channelTitle}, ${templateLabel} template — open site in a new tab`}
      className="group flex min-h-0 w-full flex-col"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
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
          className="pointer-events-none absolute right-2 top-2 z-10 inline-flex rounded-md bg-white/90 dark:bg-neutral-900/90 p-1.5 text-neutral-800 dark:text-neutral-200 opacity-0 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.1] transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
        >
          <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-2.5 min-w-0 pr-1 sm:mt-3">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-900 dark:text-neutral-100 sm:text-sm">
          {site.channelTitle}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          {templateLabel}
        </p>
      </div>
    </Link>
  );
}

function FeaturedPlaceholderCard({
  site,
  templateLabel,
}: {
  site: Ph;
  templateLabel: string;
}) {
  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-900">
        <span className="px-3 text-center text-[11px] leading-relaxed text-neutral-300 dark:text-neutral-600">
          {site.subdomain}.tiny.garden
        </span>
        <span
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.05] dark:ring-white/[0.08]"
          aria-hidden
        />
      </div>
      <div className="mt-2.5 min-w-0 pr-1 sm:mt-3">
        <p className="text-[13px] font-medium leading-snug text-neutral-900 dark:text-neutral-100 sm:text-sm">
          {site.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
          {site.desc}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          {templateLabel}
        </p>
      </div>
    </div>
  );
}

function MarqueeColumn({
  direction,
  durationSec,
  reduceMotion,
  children,
}: {
  direction: "up" | "down";
  durationSec: number;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  if (reduceMotion) {
    return (
      <div className="max-h-[min(32rem,58vh)] overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
        <div className="flex flex-col gap-3 sm:gap-4">{children}</div>
      </div>
    );
  }

  const trackClass =
    direction === "up"
      ? "featured-sites-col-track-up"
      : "featured-sites-col-track-down";

  return (
    <div className="relative max-h-[min(32rem,58vh)] min-h-[min(32rem,58vh)] overflow-hidden">
      <div
        className={`flex w-full flex-col ${trackClass}`}
        style={{ animationDuration: `${durationSec}s` }}
      >
        <div className="flex flex-col gap-3 sm:gap-4">{children}</div>
        <div className="flex flex-col gap-3 sm:gap-4" aria-hidden>
          {nonTabbableCopy(children)}
        </div>
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

  const [reduceMotion, setReduceMotion] = useState(false);
  const [colCount, setColCount] = useState(2);

  useEffect(() => {
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mqReduce.matches);
    const onReduce = () => setReduceMotion(mqReduce.matches);
    mqReduce.addEventListener("change", onReduce);

    const mqMd = window.matchMedia("(min-width: 768px)");
    const mqXl = window.matchMedia("(min-width: 1280px)");
    const updateCols = () => {
      if (mqXl.matches) setColCount(4);
      else if (mqMd.matches) setColCount(3);
      else setColCount(2);
    };
    updateCols();
    mqMd.addEventListener("change", updateCols);
    mqXl.addEventListener("change", updateCols);

    return () => {
      mqReduce.removeEventListener("change", onReduce);
      mqMd.removeEventListener("change", updateCols);
      mqXl.removeEventListener("change", updateCols);
    };
  }, []);

  const columns = distributeIntoColumns(items, colCount);

  const renderCell = (item: Live | Ph, key: string) => {
    if (hasLive && "id" in item) {
      return (
        <FeaturedLiveCard
          key={key}
          site={item}
          templateLabel={labelFor(item.template, templateNames)}
        />
      );
    }
    const ph = item as Ph;
    return (
      <FeaturedPlaceholderCard
        key={key}
        site={ph}
        templateLabel={labelFor(ph.template, templateNames)}
      />
    );
  };

  return (
    <section className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-16">
      <div className="mx-auto mb-6 max-w-3xl px-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Featured sites
        </h2>
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="featured-sites-gallery-mask rounded-sm">
          <div
            className="grid gap-3 sm:gap-4 md:gap-5"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
            }}
          >
            {columns.map((colItems, colIndex) => {
              const duration = 48 + colIndex * 9;
              const direction = colIndex % 2 === 0 ? "up" : "down";
              return (
                <MarqueeColumn
                  key={colIndex}
                  direction={direction}
                  durationSec={duration}
                  reduceMotion={reduceMotion}
                >
                  {colItems.map((item, i) =>
                    renderCell(
                      item,
                      hasLive && "id" in item
                        ? item.id
                        : `${(item as Ph).subdomain}-${i}`,
                    ),
                  )}
                </MarqueeColumn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
