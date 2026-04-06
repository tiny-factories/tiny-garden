"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/track";
import { PlanTierBadge } from "@/components/PlanTierBadge";
import { SegmentedControl, Toolbar, type ViewMode } from "@/components/toolbar";
import { SitesPageSkeleton } from "@/components/sites-dashboard-skeletons";
import { ButtondownWaitlistForm } from "@/components/buttondown-waitlist-form";
import { Button } from "@/components/button";
import { SITE_CARD_GRID_CLASS } from "@/lib/site-card-grid";

const SITES_VIEW_MODE_KEY = "tinygarden:sites-view-mode";
const SITES_LIST_SCOPE_KEY = "tinygarden:sites-list-scope";

/** Page size for "All sites" (server-paginated public catalog). */
const CATALOG_PAGE_SIZE = 24;

type SitesListScope = "yours" | "all";

function parseStoredViewMode(raw: string | null): ViewMode | null {
  if (raw === "single" || raw === "grid" || raw === "list") return raw;
  return null;
}

function parseStoredListScope(raw: string | null): SitesListScope | null {
  if (raw === "yours" || raw === "all") return raw;
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
  /** Set when listing published catalog; false = another user’s site */
  isSelf?: boolean;
  ownerArenaUsername?: string;
}

interface PublicSiteSearchItem {
  id: string;
  subdomain: string;
  channelSlug: string;
  channelTitle: string;
  template: string;
  published: boolean;
  owner: { arenaUsername: string; isSelf: boolean };
}

function PublishToggle({
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
      } ${checked ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-700"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-neutral-950 transition-transform ${
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
      className={`inline-flex items-center text-[11px] rounded-full bg-amber-50/90 dark:bg-amber-950/50 backdrop-blur-sm text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 ${shell}`}
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
        className={`inline-flex items-center text-[11px] rounded-full bg-emerald-50/90 dark:bg-emerald-950/50 backdrop-blur-sm text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 ${shell}`}
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
      className={`inline-flex items-center text-[11px] rounded-full bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur-sm text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 ${shell}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neutral-300 dark:bg-neutral-600" />
      </span>
      <span className={labelClass}>Offline</span>
    </span>
  );
}

function SitePlantThumb({
  siteId,
  size,
  className = "",
  bordered = true,
}: {
  siteId: string;
  size: number;
  className?: string;
  /** When false, no frame border (e.g. sites list row). */
  bordered?: boolean;
}) {
  const frame = bordered
    ? "border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
    : "bg-transparent";
  return (
    <Image
      src={`/api/sites/${siteId}/icon`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`rounded object-contain pointer-events-none select-none [image-rendering:crisp-edges] ${frame} ${className}`}
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
  /** Set when /api/sites or /api/account fails (e.g. 401 with a stale cookie). */
  const [loadError, setLoadError] = useState<"unauthorized" | "failed" | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [listScope, setListScope] = useState<SitesListScope>("yours");
  const [publicCatalog, setPublicCatalog] = useState<PublicSiteSearchItem[] | null>(null);
  const [publicCatalogLoading, setPublicCatalogLoading] = useState(false);
  const [publicCatalogError, setPublicCatalogError] = useState(false);
  const [catalogRetryKey, setCatalogRetryKey] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogQuery, setCatalogQuery] = useState("");
  const isFirstCatalogScopeRef = useRef(true);
  const catalogScrollSkipRef = useRef(true);

  useEffect(() => {
    try {
      const stored = parseStoredViewMode(localStorage.getItem(SITES_VIEW_MODE_KEY));
      if (stored) setViewMode(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const stored = parseStoredListScope(localStorage.getItem(SITES_LIST_SCOPE_KEY));
      if (stored) setListScope(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setListScopePersist = useCallback((scope: SitesListScope) => {
    setListScope(scope);
    try {
      localStorage.setItem(SITES_LIST_SCOPE_KEY, scope);
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

  const fetchSites = useCallback(async () => {
    const r = await fetch("/api/sites", { credentials: "same-origin" });
    const data = await r.json();
    if (!r.ok) {
      if (r.status === 401) throw new Error("unauthorized");
      throw new Error("failed");
    }
    return data;
  }, []);

  /** Debounced server query for "All sites"; resets to page 1 when the query updates. */
  useEffect(() => {
    if (listScope !== "all") {
      isFirstCatalogScopeRef.current = true;
      return;
    }
    const run = () => {
      setCatalogQuery(search.trim());
      setCatalogPage(1);
    };
    if (isFirstCatalogScopeRef.current) {
      isFirstCatalogScopeRef.current = false;
      run();
      return;
    }
    const id = window.setTimeout(run, 300);
    return () => clearTimeout(id);
  }, [search, listScope]);

  useEffect(() => {
    if (listScope !== "all") {
      setPublicCatalog(null);
      setCatalogTotal(0);
      setPublicCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setPublicCatalogLoading(true);
    setPublicCatalogError(false);
    const params = new URLSearchParams({
      scope: "public",
      limit: String(CATALOG_PAGE_SIZE),
      page: String(catalogPage),
    });
    if (catalogQuery) params.set("q", catalogQuery);
    fetch(`/api/sites/search?${params}`, { credentials: "same-origin" })
      .then(async (r) => {
        const data: unknown = await r.json();
        if (!r.ok) throw new Error("failed");
        if (
          data &&
          typeof data === "object" &&
          "items" in data &&
          Array.isArray((data as { items: unknown }).items)
        ) {
          const body = data as { items: PublicSiteSearchItem[]; total?: unknown };
          const items = body.items;
          const total =
            typeof body.total === "number" ? body.total : items.length;
          return { items, total };
        }
        return { items: [] as PublicSiteSearchItem[], total: 0 };
      })
      .then(({ items, total }) => {
        if (!cancelled) {
          setPublicCatalog(items);
          setCatalogTotal(total);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPublicCatalog(null);
          setCatalogTotal(0);
          setPublicCatalogError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setPublicCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listScope, catalogRetryKey, catalogPage, catalogQuery]);

  useEffect(() => {
    if (listScope !== "all") {
      catalogScrollSkipRef.current = true;
      return;
    }
    if (catalogScrollSkipRef.current) {
      catalogScrollSkipRef.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [catalogPage, listScope]);

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
      fetch("/api/account", { credentials: "same-origin" }).then(async (r) => {
        const accountData: unknown = await r.json();
        if (!r.ok) {
          if (r.status === 401) throw new Error("unauthorized");
          return null;
        }
        if (
          accountData &&
          typeof accountData === "object" &&
          "error" in accountData &&
          (accountData as { error?: unknown }).error
        ) {
          return null;
        }
        return accountData as AccountInfo;
      }),
    ])
      .then(([sitesData, accountData]) => {
        if (cancelled) return;
        setLoadError(null);
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setAccount(accountData);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSites([]);
          setAccount(null);
          setLoadError(
            e instanceof Error && e.message === "unauthorized" ? "unauthorized" : "failed"
          );
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
      let updated: unknown;
      try {
        updated = await fetchSites();
      } catch {
        return;
      }
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
      if (listScope === "all") setCatalogRetryKey((k) => k + 1);
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
      if (listScope === "all") setCatalogRetryKey((k) => k + 1);
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
      if (listScope === "all") setCatalogRetryKey((k) => k + 1);
    }
  }

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";

  const displaySites = useMemo((): Site[] => {
    if (listScope === "yours") return sites;
    if (!publicCatalog) return [];
    const mineById = new Map(sites.map((s) => [s.id, s]));
    return publicCatalog.map((p) => {
      const mine = mineById.get(p.id);
      return {
        id: p.id,
        subdomain: p.subdomain,
        channelSlug: p.channelSlug,
        channelTitle: p.channelTitle,
        template: p.template,
        published: mine ? mine.published : p.published,
        lastBuiltAt: mine?.lastBuiltAt ?? null,
        isSelf: p.owner.isSelf,
        ownerArenaUsername: p.owner.arenaUsername,
      };
    });
  }, [listScope, sites, publicCatalog]);

  const filtered = useMemo(() => {
    if (listScope === "all") return displaySites;
    if (!search.trim()) return displaySites;
    const q = search.toLowerCase();
    return displaySites.filter(
      (s) =>
        s.channelTitle.toLowerCase().includes(q) ||
        s.subdomain.toLowerCase().includes(q) ||
        s.template.toLowerCase().includes(q) ||
        (s.ownerArenaUsername && s.ownerArenaUsername.toLowerCase().includes(q))
    );
  }, [displaySites, listScope, search]);

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

  const catalogTotalPages = Math.max(1, Math.ceil(catalogTotal / CATALOG_PAGE_SIZE));

  return (
    <main className="min-h-screen w-full min-w-0 max-w-4xl mx-auto px-4 py-16">
      {loadError === "unauthorized" ? (
        <div
          className="mb-8 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          <p className="font-medium">Session not valid</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
            Log in again to load your sites. If this keeps happening, try logging out and back in.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block text-sm font-medium text-amber-950 underline underline-offset-2 dark:text-amber-50"
          >
            Log in
          </Link>
        </div>
      ) : null}
      {loadError === "failed" ? (
        <div
          className="mb-8 rounded-lg border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          role="alert"
        >
          <p className="font-medium">Couldn&apos;t load sites</p>
          <p className="mt-1 opacity-90">Refresh the page or try again in a moment.</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-12">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-medium">
              {listScope === "yours" ? "Your sites" : "All sites"}
            </h1>
            {listScope === "yours" && account && <PlanTierBadge plan={account.plan} />}
          </div>
          <SegmentedControl<SitesListScope>
            segments={[
              { value: "yours", label: "Your sites" },
              { value: "all", label: "All sites" },
            ]}
            value={listScope}
            onChange={setListScopePersist}
            ariaLabel="Site list"
            className="w-full max-w-xs sm:max-w-sm"
            labelClassName="text-xs font-medium"
          />
          {listScope === "yours" && account && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {sites.length} / {siteLimitLabel}
            </p>
          )}
          {listScope === "all" && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Published sites across tiny.garden. Manage only the ones you own.
            </p>
          )}
        </div>
        {account?.betaGated ? (
          <span
            className="text-sm px-3 py-1.5 border border-neutral-100 rounded text-neutral-400 cursor-not-allowed dark:border-neutral-800 dark:text-neutral-500"
            title="Free beta is full. Become a supporter from Account, or join the waitlist on the homepage."
          >
            New site
          </span>
        ) : (
          <Link
            href="/site/new"
            className="text-sm px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/80 dark:border-neutral-700"
          >
            New site
          </Link>
        )}
      </div>

      {listScope === "yours" && sites.length === 0 && account?.betaGated ? (
        <div className="text-center py-16 space-y-5 max-w-md mx-auto">
          <p className="text-sm text-neutral-600 leading-relaxed dark:text-neutral-400">
            Free beta spots are full. Join the waitlist and we&apos;ll email you when there&apos;s room, or
            become a supporter for lifetime access.
          </p>
          <ButtondownWaitlistForm idPrefix="sites-dashboard-waitlist" className="text-left" />
          <Link
            href="/account"
            className="inline-block text-sm px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/80 dark:border-neutral-700"
          >
            Become a supporter
          </Link>
        </div>
      ) : listScope === "yours" && sites.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No sites yet.</p>
          <Link
            href="/site/new"
            className="inline-block text-sm text-neutral-600 underline underline-offset-2 dark:text-neutral-400"
          >
            Create your first site
          </Link>
        </div>
      ) : listScope === "all" && publicCatalogError ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          role="alert"
        >
          <p className="font-medium">Couldn&apos;t load published sites</p>
          <p className="mt-1 opacity-90">Check your connection and try again.</p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-red-950 underline underline-offset-2 dark:text-red-50"
            onClick={() => setCatalogRetryKey((k) => k + 1)}
          >
            Try again
          </button>
        </div>
      ) : listScope === "all" && publicCatalogLoading && publicCatalog === null ? (
        <p className="text-sm text-neutral-500 py-16 text-center dark:text-neutral-400">
          Loading published sites…
        </p>
      ) : listScope === "all" && !publicCatalogLoading && publicCatalog !== null && publicCatalog.length === 0 ? (
        <p className="text-sm text-neutral-500 py-16 text-center dark:text-neutral-400">
          {catalogQuery ? (
            <>
              No published sites match &ldquo;{catalogQuery}&rdquo;.
            </>
          ) : (
            "No published sites yet."
          )}
        </p>
      ) : (
        <>
          <div
            className={
              listScope === "all" && publicCatalogLoading && publicCatalog !== null
                ? "opacity-50 transition-opacity"
                : undefined
            }
            aria-busy={
              listScope === "all" && publicCatalogLoading && publicCatalog !== null
                ? true
                : undefined
            }
          >
            <Toolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search sites..."
              viewMode={viewMode}
              onViewModeChange={setViewModePersist}
            />

            {filtered.length === 0 ? (
              <p className="text-sm text-neutral-400 py-8 text-center dark:text-neutral-500">
                {listScope === "all" ? (
                  "No sites on this page."
                ) : (
                  <>
                    No sites match &ldquo;{search}&rdquo;.
                  </>
                )}
              </p>
            ) : viewMode === "list" ? (
            /* ── List view ── */
            <div className="border border-neutral-200 rounded overflow-hidden divide-y divide-neutral-100 dark:border-neutral-700 dark:divide-neutral-800">
              {filtered.map((site) => {
                const isBuilding = !!building[site.id];
                const canManage = listScope === "yours" || site.isSelf === true;
                return (
                  <div
                    key={site.id}
                    className={`flex flex-wrap items-center gap-4 px-4 py-3 transition-colors ${
                      isBuilding
                        ? "bg-amber-50/30 dark:bg-amber-950/20"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <SitePlantThumb
                      siteId={site.id}
                      size={48}
                      bordered={false}
                      className="shrink-0 size-12"
                    />
                    <div className="min-w-0 flex-1">
                      {site.published && !isBuilding ? (
                        <a
                          href={`https://${site.subdomain}.${siteDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/live block min-w-0 max-w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-950"
                          aria-label={`Open live site ${site.subdomain}.${siteDomain}`}
                        >
                          <span className="flex min-w-0 items-center gap-1">
                            <span className="min-w-0 truncate text-sm font-medium text-neutral-950 group-hover/live:hidden dark:text-neutral-50">
                              {site.channelTitle}
                            </span>
                            <span className="hidden max-w-full min-w-0 items-center gap-0.5 group-hover/live:inline-flex">
                              <span className="min-w-0 truncate text-sm font-medium text-neutral-950 dark:text-neutral-50">
                                {site.subdomain}.
                              </span>
                              <span className="shrink-0 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                {siteDomain}
                              </span>
                              <ArrowUpRight
                                className="size-3.5 shrink-0 text-neutral-500 dark:text-neutral-400"
                                strokeWidth={2}
                                aria-hidden
                              />
                            </span>
                          </span>
                        </a>
                      ) : (
                        <p className="text-sm font-medium truncate text-neutral-950 dark:text-neutral-50">
                          {site.channelTitle}
                        </p>
                      )}
                      <p
                        className="text-xs text-neutral-400 dark:text-neutral-500"
                        title={`${site.subdomain}.${siteDomain}`}
                      >
                        {site.subdomain}.{siteDomain} · {site.template}
                        {listScope === "all" &&
                        site.ownerArenaUsername &&
                        site.isSelf === false
                          ? ` · @${site.ownerArenaUsername}`
                          : null}
                      </p>
                    </div>
                    <StatusBadge site={site} isBuilding={isBuilding} />
                    {canManage ? (
                      <>
                        <PublishToggle
                          checked={site.published}
                          loading={isBuilding}
                          onChange={() => handleTogglePublish(site)}
                        />
                        <Button
                          href={`/sites/${site.id}`}
                          variant="secondary"
                          size="inline"
                          className="shrink-0"
                        >
                          Settings
                        </Button>
                        <Button
                          variant="destructive"
                          className="shrink-0"
                          onClick={() => handleDelete(site.id)}
                        >
                          Delete
                        </Button>
                      </>
                    ) : site.published && !isBuilding ? (
                      <Button
                        href={`https://${site.subdomain}.${siteDomain}`}
                        variant="secondary"
                        size="inline"
                        className="shrink-0"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Single / Grid view ── */
            <div
              className={viewMode === "grid" ? SITE_CARD_GRID_CLASS : "space-y-3"}
            >
              {filtered.map((site) => {
                const isBuilding = !!building[site.id];
                const canManage = listScope === "yours" || site.isSelf === true;
                return (
                  <div
                    key={site.id}
                    className={`group/card border rounded overflow-hidden transition-colors ${
                      isBuilding
                        ? "border-amber-200 bg-amber-50/30 dark:border-amber-800/50 dark:bg-amber-950/20"
                        : "border-neutral-200 dark:border-neutral-700"
                    }`}
                  >
                    {/* Preview area with status badge overlay */}
                    <div className="relative">
                      {site.published && !isBuilding ? (
                        <a
                          href={`https://${site.subdomain}.${siteDomain}`}
                          target="_blank"
                          rel="noopener"
                          className="block bg-neutral-50 group/preview cursor-pointer dark:bg-neutral-900"
                        >
                          <div className="aspect-[16/9] overflow-hidden relative">
                            <iframe
                              src={`https://${site.subdomain}.${siteDomain}`}
                              className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                              tabIndex={-1}
                              title={`Preview of ${site.channelTitle}`}
                            />
                            <div className="absolute inset-0 z-10 bg-transparent group-hover/preview:bg-black/5 transition-colors pointer-events-none">
                              <span className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white/90 dark:bg-neutral-900/90 backdrop-blur px-2 py-1 rounded-md opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-sm border border-neutral-200/80 dark:border-neutral-700/80">
                                Open preview
                                <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                              </span>
                            </div>
                          </div>
                        </a>
                      ) : isBuilding ? (
                        <div className="aspect-[16/9] relative bg-gradient-to-r from-amber-50 via-white to-amber-50 dark:from-amber-950/40 dark:via-neutral-900 dark:to-amber-950/40 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />
                      ) : (
                        <div className="aspect-[16/9] relative bg-neutral-50 flex items-center justify-center dark:bg-neutral-900">
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">No preview</span>
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
                            <p className="text-sm font-medium truncate text-neutral-950 dark:text-neutral-50">{site.channelTitle}</p>
                            <p
                              className="text-xs text-neutral-400 truncate dark:text-neutral-500"
                              title={`${site.subdomain}.${siteDomain}`}
                            >
                              {site.subdomain}.{siteDomain} · {site.template}
                              {listScope === "all" &&
                              site.ownerArenaUsername &&
                              site.isSelf === false
                                ? ` · @${site.ownerArenaUsername}`
                                : null}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {canManage ? (
                            <PublishToggle
                              checked={site.published}
                              loading={isBuilding}
                              onChange={() => handleTogglePublish(site)}
                            />
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        {canManage ? (
                          <>
                            <Button
                              href={`/sites/${site.id}`}
                              variant="secondary"
                              size="inline"
                            >
                              Settings
                            </Button>
                            <Button
                              variant="destructive"
                              className="ml-auto"
                              onClick={() => handleDelete(site.id)}
                            >
                              Delete
                            </Button>
                          </>
                        ) : site.published && !isBuilding ? (
                          <Button
                            href={`https://${site.subdomain}.${siteDomain}`}
                            variant="secondary"
                            size="inline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Visit site
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          {listScope === "all" && catalogTotal > CATALOG_PAGE_SIZE ? (
            <nav
              className="mt-8 flex flex-col gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Published sites pages"
            >
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing{" "}
                <span className="tabular-nums">
                  {catalogTotal === 0
                    ? "0"
                    : `${(catalogPage - 1) * CATALOG_PAGE_SIZE + 1}–${Math.min(
                        catalogPage * CATALOG_PAGE_SIZE,
                        catalogTotal
                      )}`}
                </span>{" "}
                of <span className="tabular-nums">{catalogTotal}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  disabled={catalogPage <= 1 || publicCatalogLoading}
                  onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                  Page {catalogPage} of {catalogTotalPages}
                </span>
                <Button
                  variant="secondary"
                  size="compact"
                  type="button"
                  disabled={publicCatalogLoading || catalogPage >= catalogTotalPages}
                  onClick={() => setCatalogPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}

