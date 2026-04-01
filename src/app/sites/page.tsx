"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/track";
import { PlanTierBadge } from "@/components/PlanTierBadge";
import { Toolbar, type ViewMode } from "@/components/toolbar";
import { SitesPageSkeleton } from "@/components/sites-dashboard-skeletons";
import { ButtondownWaitlistForm } from "@/components/buttondown-waitlist-form";

const SITES_VIEW_MODE_KEY = "tinygarden:sites-view-mode";

function parseStoredViewMode(raw: string | null): ViewMode | null {
  if (raw === "single" || raw === "grid" || raw === "list") return raw;
  return null;
}

interface Site {
  id: string;
  subdomain: string;
  channelSlug: string;
  channelTitle: string;
  template: string;
  published: boolean;
  lastBuiltAt: string | null;
}

function Toggle({
  checked,
  loading,
  onChange,
}: {
  checked: boolean;
  loading: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        loading ? "opacity-50 cursor-wait" : "cursor-pointer"
      } ${checked ? "bg-neutral-900" : "bg-neutral-200"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

const buildingPhrases = [
  "Arranging blocks...",
  "Gathering images...",
  "Composing layout...",
  "Weaving pages...",
  "Planting seeds...",
  "Connecting threads...",
  "Brewing pixels...",
  "Folding origami...",
  "Tuning frequencies...",
  "Stitching together...",
];

/** Collapsed (md): fixed circle around the dot; expands to pill on card hover/focus. */
const COMPACT_BADGE_SHELL =
  "max-md:min-h-[22px] max-md:gap-1.5 max-md:px-2 max-md:justify-start md:size-[22px] md:shrink-0 md:p-0 md:gap-0 md:justify-center md:group-hover/card:h-auto md:group-hover/card:w-auto md:group-hover/card:min-h-[22px] md:group-hover/card:px-2 md:group-hover/card:gap-1.5 md:group-hover/card:justify-start md:group-focus-within/card:h-auto md:group-focus-within/card:w-auto md:group-focus-within/card:min-h-[22px] md:group-focus-within/card:px-2 md:group-focus-within/card:gap-1.5 md:group-focus-within/card:justify-start";

function BuildingBadge({ compact }: { compact?: boolean }) {
  const [phraseIndex, setPhraseIndex] = useState(
    () => Math.floor(Math.random() * buildingPhrases.length)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % buildingPhrases.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const shell = compact ? COMPACT_BADGE_SHELL : "px-2 py-0.5 gap-1.5";

  const phraseClass = compact
    ? "max-md:inline md:hidden md:group-hover/card:inline md:group-focus-within/card:inline whitespace-nowrap"
    : "";

  return (
    <span
      className={`inline-flex items-center text-[11px] rounded-full bg-amber-50/90 backdrop-blur-sm text-amber-600 border border-amber-200 ${shell}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
      </span>
      <span className={`transition-all duration-300 ${phraseClass}`}>
        {buildingPhrases[phraseIndex]}
      </span>
    </span>
  );
}

function StatusBadge({
  site,
  isBuilding,
  compact,
}: {
  site: Site;
  isBuilding: boolean;
  compact?: boolean;
}) {
  if (isBuilding) return <BuildingBadge compact={compact} />;

  const shell = compact ? COMPACT_BADGE_SHELL : "px-2 py-0.5 gap-1.5";

  const labelClass = compact
    ? "max-md:inline md:hidden md:group-hover/card:inline md:group-focus-within/card:inline whitespace-nowrap"
    : "";

  if (site.published) {
    return (
      <span
        className={`inline-flex items-center text-[11px] rounded-full bg-emerald-50/90 backdrop-blur-sm text-emerald-600 border border-emerald-200 ${shell}`}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className={labelClass}>Online</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center text-[11px] rounded-full bg-neutral-50/90 backdrop-blur-sm text-neutral-400 border border-neutral-200 ${shell}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neutral-300" />
      </span>
      <span className={labelClass}>Offline</span>
    </span>
  );
}

function SitePlantThumb({
  siteId,
  size,
  className = "",
}: {
  siteId: string;
  size: number;
  className?: string;
}) {
  return (
    <Image
      src={`/api/sites/${siteId}/icon`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`rounded border border-neutral-200 bg-white object-contain pointer-events-none select-none [image-rendering:crisp-edges] ${className}`}
    />
  );
}

interface AccountInfo {
  plan: string;
  isAdmin: boolean;
  isFriend: boolean;
  betaFull?: boolean;
  betaGated?: boolean;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("single");

  useEffect(() => {
    try {
      const stored = parseStoredViewMode(localStorage.getItem(SITES_VIEW_MODE_KEY));
      if (stored) setViewMode(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setViewModePersist = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(SITES_VIEW_MODE_KEY, mode);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const fetchSites = useCallback(() => {
    return fetch("/api/sites").then((r) => r.json());
  }, []);

  // URL params: new-site build state, post-OAuth, post-Stripe return (clean up + analytics)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    const buildingId = params.get("building");
    if (buildingId) {
      setBuilding((b) => ({ ...b, [buildingId]: true }));
      params.delete("building");
      changed = true;
    }

    if (params.get("signed_in") === "1") {
      track("oauth-completed");
      params.delete("signed_in");
      changed = true;
    }

    if (params.get("upgraded") === "true") {
      track("checkout-return");
      params.delete("upgraded");
      changed = true;
    }

    if (changed) {
      const qs = params.toString();
      const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState({}, "", next);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchSites(),
      fetch("/api/account").then((r) => r.json()),
    ])
      .then(([sitesData, accountData]) => {
        if (cancelled) return;
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setAccount(
          accountData && typeof accountData === "object" && !("error" in accountData && accountData.error)
            ? accountData
            : null
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSites([]);
          setAccount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSites]);

  // Poll for sites that are building
  useEffect(() => {
    const buildingIds = Object.entries(building)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (buildingIds.length === 0) return;

    const interval = setInterval(async () => {
      const updated = await fetchSites();
      if (!Array.isArray(updated)) return;
      setSites(updated);

      // Check if any building sites are now done
      const stillBuilding: Record<string, boolean> = {};
      let changed = false;
      for (const id of buildingIds) {
        const site = updated.find((s: Site) => s.id === id);
        if (site && !site.published && !site.lastBuiltAt) {
          stillBuilding[id] = true;
        } else {
          changed = true;
        }
      }
      if (changed) {
        setBuilding((prev) => {
          const next = { ...prev };
          for (const id of buildingIds) {
            if (!stillBuilding[id]) next[id] = false;
          }
          return next;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [building, fetchSites]);

  async function handleTogglePublish(site: Site) {
    setBuilding((b) => ({ ...b, [site.id]: true }));
    if (site.published) {
      // Unpublish
      await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: false }),
      });
      const updated = await fetchSites();
      setSites(updated);
      setBuilding((b) => ({ ...b, [site.id]: false }));
      track("site-unpublished", { subdomain: site.subdomain, template: site.template });
    } else {
      // Build and publish
      track("site-published", { subdomain: site.subdomain, template: site.template });
      await handleBuild(site.id);
    }
  }

  async function handleBuild(siteId: string) {
    setBuilding((b) => ({ ...b, [siteId]: true }));
    const site = sites.find((s) => s.id === siteId);
    const res = await fetch(`/api/sites/${siteId}/build`, { method: "POST" });
    if (res.ok) {
      const updated = await fetchSites();
      setSites(updated);
      track("rebuild-completed", {
        subdomain: site?.subdomain ?? "",
        template: site?.template ?? "",
      });
    } else {
      track("rebuild-failed", {
        status: res.status,
        subdomain: site?.subdomain ?? "",
      });
    }
    setBuilding((b) => ({ ...b, [siteId]: false }));
  }

  async function handleDelete(siteId: string) {
    if (!confirm("Delete this site?")) return;
    const site = sites.find((s) => s.id === siteId);
    const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
    if (res.ok) {
      track("site-deleted", { subdomain: site?.subdomain || "", template: site?.template || "" });
      setSites(sites.filter((s) => s.id !== siteId));
    }
  }

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";

  const filtered = useMemo(() => {
    if (!search.trim()) return sites;
    const q = search.toLowerCase();
    return sites.filter(
      (s) =>
        s.channelTitle.toLowerCase().includes(q) ||
        s.subdomain.toLowerCase().includes(q) ||
        s.template.toLowerCase().includes(q)
    );
  }, [sites, search]);

  if (loading) {
    return <SitesPageSkeleton viewMode={viewMode} />;
  }

  const siteLimitLabel =
    account?.isAdmin || account?.isFriend
      ? "∞"
      : account?.plan === "studio"
        ? "50"
        : account?.plan === "pro"
          ? "∞"
          : account?.betaGated
            ? "0"
            : "3";

  return (
    <main className="min-h-screen w-full min-w-0 max-w-4xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-12">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-medium">Your sites</h1>
            {account && <PlanTierBadge plan={account.plan} />}
          </div>
          {account && (
            <p className="text-xs text-neutral-400 mt-1">
              {sites.length} / {siteLimitLabel}
            </p>
          )}
        </div>
        {account?.betaGated ? (
          <span
            className="text-sm px-3 py-1.5 border border-neutral-100 rounded text-neutral-400 cursor-not-allowed"
            title="Free beta is full. Become a supporter from Account, or join the waitlist on the homepage."
          >
            New site
          </span>
        ) : (
          <Link
            href="/site/new"
            className="text-sm px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
          >
            New site
          </Link>
        )}
      </div>

      {sites.length === 0 && account?.betaGated ? (
        <div className="text-center py-16 space-y-5 max-w-md mx-auto">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Free beta spots are full. Join the waitlist and we&apos;ll email you when there&apos;s room, or
            become a supporter for lifetime access.
          </p>
          <ButtondownWaitlistForm idPrefix="sites-dashboard-waitlist" className="text-left" />
          <Link
            href="/account"
            className="inline-block text-sm px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
          >
            Become a supporter
          </Link>
        </div>
      ) : sites.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm text-neutral-500">No sites yet.</p>
          <Link
            href="/site/new"
            className="inline-block text-sm text-neutral-600 underline underline-offset-2"
          >
            Create your first site
          </Link>
        </div>
      ) : (
        <>
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search sites..."
            viewMode={viewMode}
            onViewModeChange={setViewModePersist}
          />

          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">
              No sites match &ldquo;{search}&rdquo;
            </p>
          ) : viewMode === "list" ? (
            /* ── List view ── */
            <div className="border border-neutral-200 rounded overflow-hidden divide-y divide-neutral-100">
              {filtered.map((site) => {
                const isBuilding = !!building[site.id];
                return (
                  <div
                    key={site.id}
                    className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                      isBuilding ? "bg-amber-50/30" : "hover:bg-neutral-50"
                    }`}
                  >
                    <SitePlantThumb siteId={site.id} size={36} className="shrink-0 size-9 p-1" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{site.channelTitle}</p>
                      <p className="text-xs text-neutral-400">
                        {site.subdomain}.{siteDomain} &middot; {site.template}
                      </p>
                    </div>
                    <StatusBadge site={site} isBuilding={isBuilding} />
                    <Toggle
                      checked={site.published}
                      loading={isBuilding}
                      onChange={() => handleTogglePublish(site)}
                    />
                    <Link
                      href={`/sites/${site.id}`}
                      className="text-xs px-2.5 py-1 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors shrink-0"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => handleDelete(site.id)}
                      className="text-xs px-2.5 py-1 text-red-500 border border-red-100 rounded hover:bg-red-50 transition-colors shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Single / Grid view ── */
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-2 gap-3"
                : "space-y-3"
            }>
              {filtered.map((site) => {
                const isBuilding = !!building[site.id];
                return (
                  <div
                    key={site.id}
                    className={`group/card border rounded overflow-hidden transition-colors ${
                      isBuilding
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-neutral-200"
                    }`}
                  >
                    {/* Preview area with status badge overlay */}
                    <div className="relative">
                      {site.published && !isBuilding ? (
                        <a
                          href={`https://${site.subdomain}.${siteDomain}`}
                          target="_blank"
                          rel="noopener"
                          className="block bg-neutral-50 group/preview cursor-pointer"
                        >
                          <div className="aspect-[16/9] overflow-hidden relative">
                            <iframe
                              src={`https://${site.subdomain}.${siteDomain}`}
                              className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                              tabIndex={-1}
                              title={`Preview of ${site.channelTitle}`}
                            />
                            <div className="absolute inset-0 z-10 bg-transparent group-hover/preview:bg-black/5 transition-colors pointer-events-none">
                              <span className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 text-xs font-medium text-neutral-700 bg-white/90 backdrop-blur px-2 py-1 rounded-md opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-sm border border-neutral-200/80">
                                Open preview
                                <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                              </span>
                            </div>
                          </div>
                        </a>
                      ) : isBuilding ? (
                        <div className="aspect-[16/9] relative bg-gradient-to-r from-amber-50 via-white to-amber-50 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />
                      ) : (
                        <div className="aspect-[16/9] relative bg-neutral-50 flex items-center justify-center">
                          <span className="text-xs text-neutral-400">No preview</span>
                        </div>
                      )}

                      <div className="absolute top-2 left-2 z-20">
                        <StatusBadge site={site} isBuilding={isBuilding} compact />
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <SitePlantThumb
                            siteId={site.id}
                            size={36}
                            className="shrink-0 size-9 p-1 mt-0.5"
                          />
                          <div className="min-w-0 self-center space-y-0.5">
                            <p className="text-sm font-medium truncate">{site.channelTitle}</p>
                            <p
                              className="text-xs text-neutral-400 truncate"
                              title={`${site.subdomain}.${siteDomain}`}
                            >
                              {site.subdomain}.{siteDomain}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Toggle
                            checked={site.published}
                            loading={isBuilding}
                            onChange={() => handleTogglePublish(site)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                        <Link
                          href={`/sites/${site.id}`}
                          className="text-xs px-2.5 py-1 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
                        >
                          Settings
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(site.id)}
                          className="text-xs px-2.5 py-1 text-red-500 border border-red-100 rounded hover:bg-red-50 transition-colors ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}

