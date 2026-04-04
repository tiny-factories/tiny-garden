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

async function readJsonBody<T>(r: Response, fallback: T): Promise<T> {
  const text = await r.text();
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
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

/** Compact donut for free vs paid plan counts; uses conic-gradient (no chart deps). */
function PlanDonut({ free, pro }: { free: number; pro: number }) {
  const total = free + pro;
  const freeDeg = total > 0 ? (free / total) * 360 : 0;

  return (
    <div className="relative h-14 w-14 shrink-0" aria-hidden>
      <div
        className="absolute inset-0 rounded-full"
        style={
          total === 0
            ? { background: "rgb(245 245 245)" }
            : {
                background: `conic-gradient(from -90deg, rgb(229 229 229) 0deg ${freeDeg}deg, rgb(38 38 38) ${freeDeg}deg 360deg)`,
              }
        }
      />
      <div className="absolute inset-[22%] rounded-full bg-white dark:bg-neutral-900" />
    </div>
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
    <div className="p-4 border border-neutral-100 rounded dark:border-neutral-800">
      <p className="text-xs text-neutral-400 dark:text-neutral-500">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-medium mt-1">{value}</p>
        {sub && <span className="text-xs text-neutral-400 dark:text-neutral-500">{sub}</span>}
      </div>
      {chart && <div className="mt-3">{chart}</div>}
    </div>
  );
}

/** Mirrors loaded admin layout (excludes billing-only blocks to avoid layout shift). */
function AdminPageSkeleton() {
  return (
    <main
      className="max-w-4xl mx-auto px-4 py-8"
      aria-busy="true"
      aria-label="Loading admin dashboard"
    >
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-8">
          <div className="h-7 w-24 rounded-md bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-9 w-[5.5rem] rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900" />
        </div>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 border border-neutral-100 rounded dark:border-neutral-800"
            >
              <div className="h-3 w-14 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 flex items-baseline gap-2">
                <div className="h-8 w-12 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800" />
              </div>
              <div className="mt-3 h-16 w-full rounded bg-neutral-100 dark:bg-neutral-900" />
            </div>
          ))}
        </section>

        <section className="mb-8">
          <div className="mb-4 h-3 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="overflow-hidden rounded border border-neutral-100 dark:border-neutral-800">
            <div className="flex gap-2 border-b border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
              {["w-[22%]", "w-[18%]", "w-14", "w-16", "w-14", "w-14", "w-16"].map(
                (w, j) => (
                  <div
                    key={j}
                    className={`h-3 shrink-0 rounded bg-neutral-200 dark:bg-neutral-800 ${w}`}
                  />
                )
              )}
            </div>
            {Array.from({ length: 6 }).map((_, r) => (
              <div
                key={r}
                className="flex items-center gap-2 border-b border-neutral-50 px-3 py-2.5 last:border-0 dark:border-neutral-800/50"
              >
                <div className="h-3 w-20 shrink-0 rounded bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-3 min-w-0 flex-1 rounded bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-3 w-14 shrink-0 rounded bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-5 w-[4.5rem] shrink-0 rounded bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-3 w-14 shrink-0 rounded bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-3 w-14 shrink-0 rounded bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-6 w-14 shrink-0 rounded bg-neutral-100 dark:bg-neutral-800" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 h-3 w-36 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border border-neutral-100 rounded p-3 dark:border-neutral-800"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 max-w-md rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 max-w-sm rounded bg-neutral-100 dark:bg-neutral-800" />
                </div>
                <div className="h-7 w-[4.5rem] shrink-0 rounded bg-neutral-100 dark:bg-neutral-800" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
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
    let cancelled = false;

    Promise.all([
      fetch("/api/admin/stats", { credentials: "same-origin" }).then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        if (r.status === 403) {
          router.push("/sites");
          return null;
        }
        if (!r.ok) return null;
        return readJsonBody<Stats | null>(r, null);
      }),
      fetch("/api/admin/feature", { credentials: "same-origin" }).then(async (r) => {
        if (!r.ok) return [] as RecentSite[];
        const data = await readJsonBody<unknown>(r, []);
        return Array.isArray(data) ? (data as RecentSite[]) : [];
      }),
      fetch("/api/admin/billing", { credentials: "same-origin" }).then(async (r) => {
        if (!r.ok) return null;
        return readJsonBody<BillingStats | null>(r, null);
      }),
    ])
      .then(([statsData, featuredData, billingData]) => {
        if (cancelled) return;
        if (statsData) setStats(statsData);
        setFeaturedSites(featuredData);
        if (billingData) setBilling(billingData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleToggleFeatured(site: RecentSite) {
    setToggling((t) => ({ ...t, [site.id]: true }));
    await fetch("/api/admin/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: site.id, featured: !site.featured }),
    });

    const [statsData, featuredData] = await Promise.all([
      fetch("/api/admin/stats", { credentials: "same-origin" }).then(async (r) => {
        if (!r.ok) return null;
        return readJsonBody<Stats | null>(r, null);
      }),
      fetch("/api/admin/feature", { credentials: "same-origin" }).then(async (r) => {
        if (!r.ok) return [] as RecentSite[];
        const data = await readJsonBody<unknown>(r, []);
        return Array.isArray(data) ? (data as RecentSite[]) : [];
      }),
    ]);
    if (statsData) setStats(statsData);
    setFeaturedSites(featuredData);
    setToggling((t) => ({ ...t, [site.id]: false }));
  }

  if (loading) {
    return <AdminPageSkeleton />;
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
          className="text-sm px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/80 dark:border-neutral-700"
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
            <div
              className="flex items-center gap-3"
              role="img"
              aria-label={`Plan split: ${stats.planBreakdown.free} free, ${stats.planBreakdown.pro} pro`}
            >
              <PlanDonut
                free={stats.planBreakdown.free}
                pro={stats.planBreakdown.pro}
              />
              <div className="flex min-w-0 flex-col gap-1.5 text-[10px] leading-tight text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-neutral-200"
                    aria-hidden
                  />
                  <span className="truncate">
                    Free <span className="font-medium text-neutral-700">{stats.planBreakdown.free}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-neutral-800"
                    aria-hidden
                  />
                  <span className="truncate">
                    Pro <span className="font-medium text-neutral-800 dark:text-neutral-200">{stats.planBreakdown.pro}</span>
                  </span>
                </div>
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
        <section className="mb-8 p-4 border border-neutral-100 rounded dark:border-neutral-800">
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-3 dark:text-neutral-500">
            Subscriptions
          </p>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm font-medium text-emerald-600">{billing.subscriptions.active}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Active</p>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600">{billing.subscriptions.pastDue}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Past due</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{billing.subscriptions.canceled}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Canceled</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-medium">{billing.subscriptions.total}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Total</p>
            </div>
          </div>
        </section>
      )}

      {/* Revenue chart — larger view */}
      {billing && revenueData.some((d) => d > 0) && (
        <section className="mb-8 p-4 border border-neutral-100 rounded dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-neutral-400 uppercase tracking-wider dark:text-neutral-500">
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
        <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-4 dark:text-neutral-500">
          Recent Sites
        </h2>
        <div className="border border-neutral-100 rounded overflow-hidden dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">Subdomain</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">Channel</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">Template</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">Status</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">User</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">Created</th>
                <th className="text-left text-xs font-medium text-neutral-400 px-3 py-2 dark:text-neutral-500">Feature</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSites.map((site) => (
                <tr key={site.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-3 py-2 text-xs font-medium">{site.subdomain}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">{site.channelTitle}</td>
                  <td className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">{site.template}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      site.published ? "bg-green-50 text-green-600" : "bg-neutral-50 text-neutral-400"
                    }`}>
                      {site.published ? "published" : "draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">{site.arenaUsername}</td>
                  <td className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">
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
        <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-4 dark:text-neutral-500">
          Currently Featured
        </h2>
        {featuredSites.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">No featured sites yet.</p>
        ) : (
          <div className="space-y-2">
            {featuredSites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between p-3 border border-neutral-100 rounded dark:border-neutral-800"
              >
                <div>
                  <p className="text-sm font-medium">{site.channelTitle}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
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
