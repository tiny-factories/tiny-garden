"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { templateDisplayNameFallback } from "@/lib/template-display-name-fallback";

export type FeaturedSiteForGallery = {
  id: string;
  subdomain: string;
  channelTitle: string;
  template: string;
  /** Are.na username of the site owner */
  arenaUsername: string;
};

const PLACEHOLDER_SITES: {
  title: string;
  desc: string;
  subdomain: string;
  template: string;
  arenaUsername: string;
}[] = [
  {
    title: "Field Notes",
    desc: "Research and observations",
    subdomain: "field-notes",
    template: "blog",
    arenaUsername: "fieldnotes",
  },
  {
    title: "Visual References",
    desc: "Collected imagery and inspiration",
    subdomain: "visual-refs",
    template: "feed",
    arenaUsername: "visual_lab",
  },
  {
    title: "Reading List",
    desc: "Articles, essays, and books",
    subdomain: "reading-list",
    template: "document",
    arenaUsername: "reader",
  },
  {
    title: "Studio Archive",
    desc: "Work in progress and documentation",
    subdomain: "studio-archive",
    template: "portfolio",
    arenaUsername: "studio",
  },
];

const CYCLE_MS = 6000;

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

function stopRowActivate(e: MouseEvent) {
  e.stopPropagation();
}

export function FeaturedSitesGallery({
  sites,
  templateNames,
  siteDomain = "tiny.garden",
}: {
  sites: FeaturedSiteForGallery[];
  templateNames: Record<string, string>;
  /** Public hostname for display (from server: NEXT_PUBLIC_SITE_DOMAIN) */
  siteDomain?: string;
}) {
  const hasLive = sites.length > 0;
  const items: (Live | Ph)[] = hasLive ? sites : PLACEHOLDER_SITES;
  const host = siteDomain;

  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(motionMq.matches);
    const onMotion = () => setReduceMotion(motionMq.matches);
    motionMq.addEventListener("change", onMotion);

    const lgMq = window.matchMedia("(min-width: 1024px)");
    setIsLg(lgMq.matches);
    const onLg = () => setIsLg(lgMq.matches);
    lgMq.addEventListener("change", onLg);

    return () => {
      motionMq.removeEventListener("change", onMotion);
      lgMq.removeEventListener("change", onLg);
    };
  }, []);

  useEffect(() => {
    setActiveIndex((i) => (items.length === 0 ? 0 : Math.min(i, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    if (reduceMotion || items.length <= 1 || hovered || !isLg) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length);
      setProgressKey((k) => k + 1);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [items.length, reduceMotion, hovered, isLg]);

  const active = items[activeIndex];
  const activeSubdomain = active
    ? hasLive
      ? (active as Live).subdomain
      : (active as Ph).subdomain
    : "";
  const activeChannelTitle = active
    ? hasLive
      ? (active as Live).channelTitle
      : (active as Ph).title
    : "";
  const selectRow = useCallback((i: number) => {
    setActiveIndex(i);
    setProgressKey((k) => k + 1);
  }, []);

  const rowsMeta = items.map((item, i) => {
    const templateLabel = labelFor(
      hasLive && "id" in item ? item.template : (item as Ph).template,
      templateNames,
    );
    const subdomain = hasLive
      ? (item as Live).subdomain
      : (item as Ph).subdomain;
    const channelTitle = hasLive
      ? (item as Live).channelTitle
      : (item as Ph).title;
    const arenaUsername = hasLive
      ? (item as Live).arenaUsername
      : (item as Ph).arenaUsername;
    const rowKey =
      hasLive && "id" in item ? item.id : `${(item as Ph).subdomain}-${i}`;
    return {
      key: rowKey,
      templateLabel,
      subdomain,
      channelTitle,
      arenaUsername,
      serveHref: `/api/serve/${subdomain}`,
      fullHost: `${subdomain}.${host}`,
      desc: !hasLive ? (item as Ph).desc : undefined,
    };
  });

  return (
    <section className="border-t border-neutral-100 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 md:mb-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Featured sites
          </h2>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          {/* Mini browser frame — hidden on small screens */}
          <div className="hidden min-w-0 w-full max-w-md shrink-0 lg:block lg:sticky lg:top-24 lg:max-w-[26rem]">
            <div className="overflow-hidden rounded-lg border border-neutral-200/90 bg-neutral-200/60 shadow-md ring-1 ring-black/[0.04] dark:border-neutral-700 dark:bg-neutral-800/40 dark:ring-white/[0.06]">
              <div className="flex items-center gap-2.5 border-b border-neutral-300/80 bg-neutral-100 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                <span className="flex shrink-0 gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-[#ff5f57] shadow-sm ring-1 ring-black/[0.08]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e] shadow-sm ring-1 ring-black/[0.08]" />
                  <span className="size-2.5 rounded-full bg-[#28c840] shadow-sm ring-1 ring-black/[0.08]" />
                </span>
                <div
                  className="min-w-0 flex-1 truncate rounded-md bg-white px-2.5 py-1 text-center font-mono text-[10px] leading-tight text-neutral-500 tabular-nums shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] dark:bg-neutral-950 dark:text-neutral-400 dark:ring-white/[0.08]"
                  title={
                    active
                      ? `https://${activeSubdomain}.${host}/`
                      : undefined
                  }
                >
                  {active ? (
                    <>
                      <span className="text-neutral-400 dark:text-neutral-600">
                        https://
                      </span>
                      {activeSubdomain}.{host}
                      <span className="text-neutral-400 dark:text-neutral-600">
                        /
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950">
                {hasLive && activeSubdomain ? (
                  <iframe
                    key={activeSubdomain}
                    src={`/api/serve/${activeSubdomain}`}
                    className="pointer-events-none absolute inset-0 h-[200%] w-[200%] origin-top-left scale-50"
                    title={`Live preview: ${activeChannelTitle}`}
                    loading="lazy"
                  />
                ) : active ? (
                  <div
                    className="flex h-full flex-col bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900"
                    aria-hidden
                  >
                    <div className="h-2 shrink-0 border-b border-neutral-200/80 bg-white/80 dark:border-neutral-800 dark:bg-neutral-950/80" />
                    <div className="flex flex-1 items-center justify-center p-6">
                      <div className="max-w-[85%] rounded-md border border-dashed border-neutral-300 bg-white/60 px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
                        <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-600">
                          {activeSubdomain}.{host}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
                <span
                  className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          {/* Directory */}
          <div className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
                  >
                    Channel
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
                  >
                    Maker
                  </th>
                  <th
                    scope="col"
                    className="hidden w-[1%] whitespace-nowrap px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 md:table-cell"
                  >
                    Template
                  </th>
                  <th scope="col" className="w-10 px-4 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsMeta.map((row, i) => (
                  <tr
                    key={`${row.key}-${i === activeIndex ? progressKey : "idle"}`}
                    aria-current={i === activeIndex ? "true" : undefined}
                    onClick={() => selectRow(i)}
                    onMouseEnter={() => { selectRow(i); setHovered(true); }}
                    onMouseLeave={() => setHovered(false)}
                    className="cursor-pointer border-b border-neutral-100 last:border-b-0 dark:border-neutral-800/80"
                    style={
                      i === activeIndex && !reduceMotion && isLg
                        ? {
                            backgroundImage:
                              "linear-gradient(to right, var(--featured-progress), var(--featured-progress))",
                            backgroundRepeat: "no-repeat",
                            ...(hovered
                              ? { backgroundSize: "100% 100%" }
                              : {
                                  animation: `progress-fill-bg ${CYCLE_MS}ms linear`,
                                  animationFillMode: "forwards",
                                }),
                          }
                        : undefined
                    }
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {row.channelTitle}
                      </p>
                    </td>
                    <td className="align-middle px-4 py-3.5">
                      <span className="text-[13px] text-neutral-600 dark:text-neutral-400">
                        @{row.arenaUsername}
                      </span>
                      {!hasLive && row.desc ? (
                        <p className="mt-0.5 max-w-md text-xs leading-snug text-neutral-400 dark:text-neutral-500 hidden sm:block">
                          {row.desc}
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden align-middle px-4 py-3.5 md:table-cell">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                        {row.templateLabel}
                      </span>
                    </td>
                    <td className="w-10 align-middle px-4 py-3.5">
                      {hasLive ? (
                        <Link
                          href={row.serveHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={stopRowActivate}
                          aria-label={`Open ${row.channelTitle} in a new tab`}
                          className="inline-flex text-neutral-400 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
                        >
                          <ArrowUpRight className="size-4 shrink-0" strokeWidth={2} />
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
