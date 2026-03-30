"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { track } from "@/lib/track";
import { PlanTierBadge } from "@/components/PlanTierBadge";
import { Toolbar, type ViewMode } from "@/components/toolbar";

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

function BuildingBadge() {
  const [phraseIndex, setPhraseIndex] = useState(
    () => Math.floor(Math.random() * buildingPhrases.length)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % buildingPhrases.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-amber-50/90 backdrop-blur-sm text-amber-600 border border-amber-200">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
      </span>
      <span className="transition-all duration-300">{buildingPhrases[phraseIndex]}</span>
    </span>
  );
}

function StatusBadge({ site, isBuilding }: { site: Site; isBuilding: boolean }) {
  if (isBuilding) return <BuildingBadge />;

  if (site.published) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50/90 backdrop-blur-sm text-emerald-600 border border-emerald-200">
        <span className="relative flex h-1.5 w-1.5">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        Online
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-neutral-50/90 backdrop-blur-sm text-neutral-400 border border-neutral-200">
      <span className="relative flex h-1.5 w-1.5">
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neutral-300" />
      </span>
      Offline
    </span>
  );
}

interface AccountInfo {
  plan: string;
  isAdmin: boolean;
  isFriend: boolean;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("single");

  const fetchSites = useCallback(() => {
    return fetch("/api/sites").then((r) => r.json());
  }, []);

  useEffect(() => {
    Promise.all([
      fetchSites(),
      fetch("/api/account").then((r) => r.json()),
    ])
      .then(([sitesData, accountData]) => {
        setSites(sitesData);
        setAccount(accountData);

        // No auto-detection of building state — only show building when user toggles on
      })
      .finally(() => setLoading(false));
  }, [fetchSites]);

  // Poll for sites that are building
  useEffect(() => {
    const buildingIds = Object.entries(building)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (buildingIds.length === 0) return;

    const interval = setInterval(async () => {
      const updated = await fetchSites();
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
    const res = await fetch(`/api/sites/${siteId}/build`, { method: "POST" });
    if (res.ok) {
      const updated = await fetchSites();
      setSites(updated);
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

  return (
    <main className="min-h-screen max-w-4xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-12">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-medium">Your sites</h1>
            {account && <PlanTierBadge plan={account.plan} />}
          </div>
          {account && (
            <p className="text-xs text-neutral-400 mt-1">
              {sites.length} / {account.isAdmin || account.isFriend ? "∞" : account.plan === "studio" ? "50" : account.plan === "pro" ? "∞" : "3"}
            </p>
          )}
        </div>
        <Link
          href="/site/new"
          className="text-sm px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
        >
          New site
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border border-neutral-200 rounded animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3.5 w-36 bg-neutral-100 rounded" />
                  <div className="h-3 w-52 bg-neutral-50 rounded" />
                </div>
                <div className="h-5 w-9 bg-neutral-100 rounded-full" />
              </div>
            </div>
          ))}
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
            onViewModeChange={setViewMode}
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
                    className={`border rounded overflow-hidden transition-colors ${
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
                          className="block bg-neutral-50 group cursor-pointer"
                        >
                          <div className="aspect-[16/9] overflow-hidden">
                            <iframe
                              src={`https://${site.subdomain}.${siteDomain}`}
                              className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                              tabIndex={-1}
                              title={`Preview of ${site.channelTitle}`}
                            />
                          </div>
                          <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors flex items-center justify-center">
                            <span className="text-xs bg-white/90 backdrop-blur px-2.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              Open preview
                            </span>
                          </div>
                        </a>
                      ) : isBuilding ? (
                        <div className="aspect-[16/9] bg-gradient-to-r from-amber-50 via-white to-amber-50 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />
                      ) : (
                        <div className="aspect-[16/9] bg-neutral-50" />
                      )}

                      {/* Status badge — upper right of preview */}
                      <div className="absolute top-2 right-2 z-10">
                        <StatusBadge site={site} isBuilding={isBuilding} />
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-medium truncate">{site.channelTitle}</p>
                          <p className="text-xs text-neutral-400">
                            {site.subdomain}.{siteDomain} &middot; {site.template}
                          </p>
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
