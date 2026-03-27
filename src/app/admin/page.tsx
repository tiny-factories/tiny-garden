"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalSites: number;
  publishedSites: number;
  planBreakdown: { free: number; pro: number };
  recentSites: RecentSite[];
}

interface RecentSite {
  id: string;
  subdomain: string;
  channelTitle: string;
  template: string;
  published: boolean;
  featured: boolean;
  arenaUsername: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [featuredSites, setFeaturedSites] = useState<RecentSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        if (r.status === 403) {
          router.push("/sites");
          return null;
        }
        return r.json();
      }),
      fetch("/api/admin/feature").then((r) => r.json()),
    ])
      .then(([statsData, featuredData]) => {
        if (statsData) setStats(statsData);
        setFeaturedSites(featuredData);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleToggleFeatured(site: RecentSite) {
    setToggling((t) => ({ ...t, [site.id]: true }));
    await fetch("/api/admin/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: site.id, featured: !site.featured }),
    });

    // Refresh data
    const [statsData, featuredData] = await Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/feature").then((r) => r.json()),
    ]);
    setStats(statsData);
    setFeaturedSites(featuredData);
    setToggling((t) => ({ ...t, [site.id]: false }));
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-neutral-100 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-neutral-50 rounded" />
            ))}
          </div>
          <div className="h-48 bg-neutral-50 rounded" />
        </div>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-medium">Admin</h1>
        <Link
          href="/admin/sites"
          className="text-sm px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
        >
          All sites
        </Link>
      </div>

      {/* Stats cards */}
      <section className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 border border-neutral-100 rounded">
          <p className="text-xs text-neutral-400">Total Users</p>
          <p className="text-2xl font-medium mt-1">{stats.totalUsers}</p>
        </div>
        <div className="p-4 border border-neutral-100 rounded">
          <p className="text-xs text-neutral-400">Total Sites</p>
          <p className="text-2xl font-medium mt-1">{stats.totalSites}</p>
        </div>
        <div className="p-4 border border-neutral-100 rounded">
          <p className="text-xs text-neutral-400">Published Sites</p>
          <p className="text-2xl font-medium mt-1">{stats.publishedSites}</p>
        </div>
      </section>

      {/* Plan breakdown */}
      <section className="mb-8 p-4 border border-neutral-100 rounded">
        <p className="text-xs text-neutral-400 uppercase tracking-wider mb-3">
          Plan Breakdown
        </p>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm font-medium">{stats.planBreakdown.free}</p>
            <p className="text-xs text-neutral-400">Free</p>
          </div>
          <div>
            <p className="text-sm font-medium">{stats.planBreakdown.pro}</p>
            <p className="text-xs text-neutral-400">Pro</p>
          </div>
        </div>
      </section>

      {/* Recent sites table */}
      <section className="mb-8">
        <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-4">
          Recent Sites
        </h2>
        <div className="border border-neutral-100 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">
                  Subdomain
                </th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">
                  Channel
                </th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">
                  Template
                </th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">
                  User
                </th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">
                  Created
                </th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">
                  Feature
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSites.map((site) => (
                <tr
                  key={site.id}
                  className="border-b border-neutral-50 last:border-0"
                >
                  <td className="px-3 py-2 text-xs font-medium">
                    {site.subdomain}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-500">
                    {site.channelTitle}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-400">
                    {site.template}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        site.published
                          ? "bg-green-50 text-green-600"
                          : "bg-neutral-50 text-neutral-400"
                      }`}
                    >
                      {site.published ? "published" : "draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-400">
                    {site.arenaUsername}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-400">
                    {new Date(site.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggleFeatured(site)}
                      disabled={!!toggling[site.id]}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        toggling[site.id]
                          ? "opacity-50 cursor-wait"
                          : "cursor-pointer"
                      } ${
                        site.featured
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-white border-neutral-200 text-neutral-400 hover:text-neutral-600"
                      }`}
                    >
                      {site.featured ? "Featured" : "Feature"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Featured sites */}
      <section>
        <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-4">
          Currently Featured
        </h2>
        {featuredSites.length === 0 ? (
          <p className="text-sm text-neutral-400">No featured sites yet.</p>
        ) : (
          <div className="space-y-2">
            {featuredSites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between p-3 border border-neutral-100 rounded"
              >
                <div>
                  <p className="text-sm font-medium">{site.channelTitle}</p>
                  <p className="text-xs text-neutral-400">
                    {site.subdomain}.tiny.garden &middot; by {site.arenaUsername}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleFeatured(site)}
                  disabled={!!toggling[site.id]}
                  className="text-xs px-2 py-0.5 rounded border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Unfeature
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
