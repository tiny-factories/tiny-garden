"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { FeaturedToggleButton } from "@/components/featured-toggle-button";
import { PublishStatusBadge } from "@/components/publish-status-badge";
import { SearchInput } from "@/components/search-input";

interface Site {
  id: string;
  subdomain: string;
  channelTitle: string;
  channelSlug: string;
  template: string;
  published: boolean;
  featured: boolean;
  lastBuiltAt: string | null;
  lastBuildError: string | null;
  createdAt: string;
  updatedAt: string;
  arenaUsername: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminSitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [rebuilding, setRebuilding] = useState<Record<string, boolean>>({});
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "published" | "draft" | "error"
  >("all");
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/sites")
      .then((r) => {
        if (r.status === 403) {
          router.push("/sites");
          return [];
        }
        return r.json();
      })
      .then(setSites)
      .finally(() => setLoading(false));
  }, [router]);

  async function toggleFeatured(siteId: string, featured: boolean) {
    setToggling((t) => ({ ...t, [siteId]: true }));
    const res = await fetch("/api/admin/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, featured }),
    });
    if (res.ok) {
      setSites(
        sites.map((s) =>
          s.id === siteId ? { ...s, featured } : s
        )
      );
    }
    setToggling((t) => ({ ...t, [siteId]: false }));
  }

  async function rebuildSite(siteId: string) {
    setRebuildError(null);
    setRebuilding((r) => ({ ...r, [siteId]: true }));
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/build`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRebuildError(
          typeof data.error === "string" ? data.error : "Rebuild failed"
        );
        setSites((prev) =>
          prev.map((s) => {
            if (s.id !== siteId) return s;
            const err =
              typeof data.lastBuildError === "string"
                ? data.lastBuildError
                : typeof data.error === "string"
                  ? data.error
                  : s.lastBuildError;
            return {
              ...s,
              lastBuildError: err ?? s.lastBuildError,
              ...(typeof data.lastBuiltAt === "string"
                ? { lastBuiltAt: data.lastBuiltAt }
                : {}),
              ...(typeof data.published === "boolean"
                ? { published: data.published }
                : {}),
            };
          })
        );
        return;
      }
      setSites((prev) =>
        prev.map((s) =>
          s.id === siteId
            ? {
                ...s,
                published:
                  typeof data.published === "boolean" ? data.published : true,
                lastBuildError:
                  data.lastBuildError === null || data.lastBuildError === undefined
                    ? null
                    : typeof data.lastBuildError === "string"
                      ? data.lastBuildError
                      : s.lastBuildError,
                ...(typeof data.lastBuiltAt === "string"
                  ? { lastBuiltAt: data.lastBuiltAt }
                  : {}),
              }
            : s
        )
      );
    } finally {
      setRebuilding((r) => ({ ...r, [siteId]: false }));
    }
  }

  const filtered = sites.filter((s) => {
    if (filterStatus === "published" && (!s.published || s.lastBuildError))
      return false;
    if (filterStatus === "draft" && (s.published || s.lastBuildError))
      return false;
    if (filterStatus === "error" && !s.lastBuildError) return false;
    if (filterFeatured && !s.featured) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.subdomain.toLowerCase().includes(q) ||
        s.channelTitle.toLowerCase().includes(q) ||
        s.arenaUsername.toLowerCase().includes(q) ||
        s.template.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const publishedLiveCount = sites.filter(
    (s) => s.published && !s.lastBuildError
  ).length;
  const buildErrorCount = sites.filter((s) => s.lastBuildError).length;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 dark:text-neutral-500"
            >
              &larr; Admin
            </Link>
          </div>
          <h1 className="text-lg font-medium mt-1">All Sites</h1>
          <p className="text-xs text-neutral-400 mt-0.5 dark:text-neutral-500">
            {sites.length} total &middot; {publishedLiveCount} published
            {buildErrorCount > 0
              ? ` · ${buildErrorCount} build error${buildErrorCount === 1 ? "" : "s"}`
              : ""}{" "}
            &middot; {sites.filter((s) => s.featured).length} featured
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sites..."
          aria-label="Search sites"
        />
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(
              e.target.value as "all" | "published" | "draft" | "error"
            )
          }
          className="px-2 py-1.5 text-sm border border-neutral-200 rounded text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
        >
          <option value="all">All status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="error">Build error</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer dark:text-neutral-400">
          <input
            type="checkbox"
            checked={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.checked)}
            className="rounded"
          />
          Featured only
        </label>
      </div>

      {rebuildError && (
        <p className="text-xs text-red-600 mb-3" role="alert">
          {rebuildError}
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-neutral-50 rounded animate-pulse dark:bg-neutral-900" />
          ))}
        </div>
      ) : (
        <div className="border border-neutral-200 rounded overflow-hidden dark:border-neutral-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs text-neutral-400 dark:text-neutral-500 dark:bg-neutral-900">
                <th className="px-3 py-2 font-medium">Site</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Template</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Last built</th>
                <th className="px-3 py-2 font-medium text-right">Rebuild</th>
                <th className="px-3 py-2 font-medium text-right">Featured</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((site) => (
                <tr key={site.id} className="border-t border-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 dark:border-neutral-800">
                  <td className="px-3 py-2.5">
                    <div>
                      <span className="font-medium">{site.channelTitle}</span>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">{site.subdomain}.tiny.garden</p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {site.arenaUsername}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {site.template}
                  </td>
                  <td className="px-3 py-2.5">
                    {site.lastBuildError ? (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded border border-red-200/90 bg-red-50 font-medium text-red-800 block max-w-[140px] dark:border-red-900/50 dark:bg-red-950/45 dark:text-red-300"
                        title={site.lastBuildError}
                      >
                        Build error
                      </span>
                    ) : (
                      <PublishStatusBadge
                        published={site.published}
                        size="compact"
                        labelFormat="title"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-400 dark:text-neutral-500">
                    {formatDate(site.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-400 dark:text-neutral-500">
                    {site.lastBuiltAt ? timeAgo(site.lastBuiltAt) : "Never"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => rebuildSite(site.id)}
                      disabled={!!rebuilding[site.id]}
                      className="text-[10px] px-2 py-0.5 rounded transition-colors disabled:opacity-50 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:bg-neutral-800"
                    >
                      {rebuilding[site.id] ? "…" : "Rebuild"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <FeaturedToggleButton
                      featured={site.featured}
                      disabled={!!toggling[site.id]}
                      onClick={() => toggleFeatured(site.id, !site.featured)}
                      size="compact"
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
                    No sites match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
