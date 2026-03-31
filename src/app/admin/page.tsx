"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TimelinePoint {
  date: string;
  count: number;
}

interface RevenuePoint {
  date: string;
  amount: number;
}

interface Stats {
  totalUsers: number;
  totalSites: number;
  publishedSites: number;
  planBreakdown: { free: number; pro: number };
  userSignups: TimelinePoint[];
  siteCreations: TimelinePoint[];
  recentSites: RecentSite[];
}

interface BillingStats {
  subscriptions: {
    active: number;
    canceled: number;
    pastDue: number;
    total: number;
  };
  mrr: number;
  totalRevenue30d: number;
  revenueTimeline: RevenuePoint[];
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

// Simple SVG sparkline bar chart
function BarChart({
  data,
  height = 64,
  color = "#1a1a1a",
}: {
  data: number[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data, 1);
  const barWidth = 100 / data.length;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      {data.map((value, i) => {
        const barHeight = (value / max) * (height - 2);
        return (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.15}
            y={height - barHeight}
            width={barWidth * 0.7}
            height={barHeight}
            fill={color}
            opacity={value > 0 ? 0.8 : 0.1}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

function Sparkline({
  data,
  height = 48,
  color = "#1a1a1a",
}: {
  data: number[];
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} 100,${height}`;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <polygon points={areaPoints} fill={color} opacity={0.08} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  sub,
  chart,
}: {
  label: string;
  value: string | number;
  sub?: string;
  chart?: React.ReactNode;
}) {
  return (
    <div className="p-4 border border-neutral-100 rounded">
      <p className="text-xs text-neutral-400">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-medium mt-1">{value}</p>
        {sub && <span className="text-xs text-neutral-400">{sub}</span>}
      </div>
      {chart && <div className="mt-3">{chart}</div>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [billing, setBilling] = useState<BillingStats | null>(null);
  const [featuredSites, setFeaturedSites] = useState<RecentSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        if (r.status === 403) { router.push("/sites"); return null; }
        return r.json();
      }),
      fetch("/api/admin/feature").then((r) => r.json()),
      fetch("/api/admin/billing").then((r) => r.ok ? r.json() : null),
    ])
      .then(([statsData, featuredData, billingData]) => {
        if (statsData) setStats(statsData);
        setFeaturedSites(featuredData);
        if (billingData) setBilling(billingData);
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-neutral-100 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-neutral-50 rounded" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!stats) return null;

  const signupData = stats.userSignups.map((d) => d.count);
  const siteData = stats.siteCreations.map((d) => d.count);
  const revenueData = billing?.revenueTimeline.map((d) => d.amount) || [];

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-medium">Admin</h1>
        <Link
          href="/admin/sites"
          className="text-sm px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
        >
          All sites
        </Link>
      </div>

      {/* Top stats row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Users"
          value={stats.totalUsers}
          sub="total"
          chart={<BarChart data={signupData} color="#1a1a1a" />}
        />
        <StatCard
          label="Sites"
          value={stats.totalSites}
          sub={`${stats.publishedSites} published`}
          chart={<BarChart data={siteData} color="#3b82f6" />}
        />
        <StatCard
          label="Free / Pro"
          value={`${stats.planBreakdown.free} / ${stats.planBreakdown.pro}`}
          chart={
            <div className="flex gap-1 items-end h-8">
              <div className="flex-1 flex flex-col justify-end">
                <div
                  className="bg-neutral-200 rounded-sm"
                  style={{
                    height: `${Math.max((stats.planBreakdown.free / Math.max(stats.totalUsers, 1)) * 32, 2)}px`,
                  }}
                />
                <span className="text-[10px] text-neutral-400 mt-1">Free</span>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <div
                  className="bg-neutral-800 rounded-sm"
                  style={{
                    height: `${Math.max((stats.planBreakdown.pro / Math.max(stats.totalUsers, 1)) * 32, 2)}px`,
                  }}
                />
                <span className="text-[10px] text-neutral-400 mt-1">Pro</span>
              </div>
            </div>
          }
        />
        {billing ? (
          <StatCard
            label="MRR"
            value={`$${billing.mrr.toFixed(2)}`}
            sub={`$${billing.totalRevenue30d.toFixed(2)} / 30d`}
            chart={<Sparkline data={revenueData} color="#16a34a" />}
          />
        ) : (
          <StatCard label="MRR" value="--" sub="Stripe not connected" />
        )}
      </section>

      {/* Stripe subscriptions */}
      {billing && (
        <section className="mb-8 p-4 border border-neutral-100 rounded">
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-3">
            Subscriptions
          </p>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm font-medium text-emerald-600">{billing.subscriptions.active}</p>
              <p className="text-xs text-neutral-400">Active</p>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600">{billing.subscriptions.pastDue}</p>
              <p className="text-xs text-neutral-400">Past due</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-400">{billing.subscriptions.canceled}</p>
              <p className="text-xs text-neutral-400">Canceled</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-medium">{billing.subscriptions.total}</p>
              <p className="text-xs text-neutral-400">Total</p>
            </div>
          </div>
        </section>
      )}

      {/* Revenue chart — larger view */}
      {billing && revenueData.some((d) => d > 0) && (
        <section className="mb-8 p-4 border border-neutral-100 rounded">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-neutral-400 uppercase tracking-wider">
              Revenue (30 days)
            </p>
            <p className="text-sm font-medium">${billing.totalRevenue30d.toFixed(2)}</p>
          </div>
          <BarChart data={revenueData} height={120} color="#16a34a" />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-neutral-300">
              {billing.revenueTimeline[0]?.date.slice(5)}
            </span>
            <span className="text-[10px] text-neutral-300">
              {billing.revenueTimeline[billing.revenueTimeline.length - 1]?.date.slice(5)}
            </span>
          </div>
        </section>
      )}

      {/* Recent sites table */}
      <section className="mb-8">
        <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-4">
          Recent Sites
        </h2>
        <div className="border border-neutral-100 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">Subdomain</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">Channel</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">Template</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">Status</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">User</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">Created</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2">Feature</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSites.map((site) => (
                <tr key={site.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-3 py-2 text-xs font-medium">{site.subdomain}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500">{site.channelTitle}</td>
                  <td className="px-3 py-2 text-xs text-neutral-400">{site.template}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      site.published ? "bg-green-50 text-green-600" : "bg-neutral-50 text-neutral-400"
                    }`}>
                      {site.published ? "published" : "draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-400">{site.arenaUsername}</td>
                  <td className="px-3 py-2 text-xs text-neutral-400">
                    {new Date(site.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggleFeatured(site)}
                      disabled={!!toggling[site.id]}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        toggling[site.id] ? "opacity-50 cursor-wait" : "cursor-pointer"
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
