"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
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

  const filtered = sites.filter((s) => {
    if (filterStatus === "published" && !s.published) return false;
    if (filterStatus === "draft" && s.published) return false;
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

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              &larr; Admin
            </Link>
          </div>
          <h1 className="text-lg font-medium mt-1">All Sites</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            {sites.length} total &middot; {sites.filter((s) => s.published).length} published &middot; {sites.filter((s) => s.featured).length} featured
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
          onChange={(e) => setFilterStatus(e.target.value as "all" | "published" | "draft")}
          className="px-2 py-1.5 text-sm border border-neutral-200 rounded text-neutral-600"
        >
          <option value="all">All status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer">
          <input
            type="checkbox"
            checked={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.checked)}
            className="rounded"
          />
          Featured only
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-neutral-50 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="border border-neutral-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs text-neutral-400">
                <th className="px-3 py-2 font-medium">Site</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Template</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Last built</th>
                <th className="px-3 py-2 font-medium text-right">Featured</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((site) => (
                <tr key={site.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2.5">
                    <div>
                      <span className="font-medium">{site.channelTitle}</span>
                      <p className="text-xs text-neutral-400">{site.subdomain}.tiny.garden</p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-500">
                    {site.arenaUsername}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-500">
                    {site.template}
                  </td>
                  <td className="px-3 py-2.5">
                    {site.published ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
                        Published
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-400 rounded">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-400">
                    {formatDate(site.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-400">
                    {site.lastBuiltAt ? timeAgo(site.lastBuiltAt) : "Never"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => toggleFeatured(site.id, !site.featured)}
                      disabled={!!toggling[site.id]}
                      className={`text-[10px] px-2 py-0.5 rounded transition-colors disabled:opacity-50 ${
                        site.featured
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                      }`}
                    >
                      {site.featured ? "Featured" : "Feature"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-xs text-neutral-400">
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
