"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FeaturedToggleButton } from "@/components/featured-toggle-button";
import { PublishStatusBadge } from "@/components/publish-status-badge";
import { SearchInput } from "@/components/search-input";
import { SegmentedControl } from "@/components/toolbar";
import { SITE_CARD_GRID_CLASS } from "@/lib/site-card-grid";

type AdminTab = "recent" | "templates" | "featured";

interface AdminTemplateExampleRow {
  id: string;
  name: string;
  description: string;
  channelSlug: string | null;
  channelTitle: string | null;
  updatedAt: string | null;
}

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
  channelSlug: string;
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
        <div className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="h-7 w-24 rounded-md bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-16 rounded bg-neutral-100 dark:bg-neutral-800" />
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

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="h-9 min-w-0 flex-1 rounded border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900" />
          <div className="h-8 w-full shrink-0 rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-[19rem]" />
        </div>

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
  const [templateExamples, setTemplateExamples] = useState<AdminTemplateExampleRow[]>([]);
  const [hasExampleToken, setHasExampleToken] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("recent");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [listSearch, setListSearch] = useState("");

  useEffect(() => {
    setListSearch("");
  }, [activeTab]);

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
      fetch("/api/admin/template-channels", { credentials: "same-origin" }).then(async (r) => {
        if (!r.ok) return { templates: [] as AdminTemplateExampleRow[], hasExampleToken: false };
        return readJsonBody<{ templates?: AdminTemplateExampleRow[]; hasExampleToken?: boolean }>(
          r,
          { templates: [], hasExampleToken: false }
        );
      }),
    ])
      .then(([statsData, featuredData, billingData, templateData]) => {
        if (cancelled) return;
        if (statsData) setStats(statsData);
        setFeaturedSites(featuredData);
        if (billingData) setBilling(billingData);
        setTemplateExamples(
          Array.isArray(templateData.templates) ? templateData.templates : []
        );
        setHasExampleToken(!!templateData.hasExampleToken);
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

  const filteredRecentSites = useMemo(() => {
    if (!stats) return [];
    const q = listSearch.trim().toLowerCase();
    if (!q) return stats.recentSites;
    return stats.recentSites.filter((s) =>
      [s.subdomain, s.channelSlug, s.channelTitle, s.template, s.arenaUsername].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [stats, listSearch]);

  const filteredTemplateRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return templateExamples;
    return templateExamples.filter((t) =>
      [t.id, t.name, t.description, t.channelTitle ?? ""].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [templateExamples, listSearch]);

  const filteredFeaturedSites = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return featuredSites;
    return featuredSites.filter((s) =>
      [s.subdomain, s.channelTitle, s.arenaUsername].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [featuredSites, listSearch]);

  if (loading) {
    return <AdminPageSkeleton />;
  }

  if (!stats) return null;

  const signupData = stats.userSignups.map((d) => d.count);
  const siteData = stats.siteCreations.map((d) => d.count);
  const revenueData = billing?.revenueTimeline.map((d) => d.amount) || [];
  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";

  const searchPlaceholder =
    activeTab === "recent"
      ? "Search subdomain, channel, template, user…"
      : activeTab === "templates"
        ? "Search templates…"
        : "Search featured sites…";

  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl overflow-x-clip px-4 py-8 [scrollbar-gutter:stable]">
      <div className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-lg font-medium">Admin</h1>
        <Link
          href="/admin/sites"
          className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 dark:text-neutral-500"
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

      <div className="mb-6 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <SearchInput
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="min-h-9 min-w-0 w-full !flex-1 basis-0 sm:min-w-[min(100%,18rem)]"
        />
        <SegmentedControl<AdminTab>
          segments={[
            { value: "recent", label: "Recent Sites" },
            { value: "templates", label: "Templates" },
            { value: "featured", label: "Featured" },
          ]}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="Admin sections"
          className="w-full shrink-0 sm:max-w-[19rem] sm:!h-8 !min-h-8 !py-1"
          labelClassName="px-1.5 py-1 text-[11px] font-medium leading-none"
        />
      </div>

      {activeTab === "recent" && (
        <>
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
      <section className="mb-8 min-w-0">
        <div className="overflow-x-auto rounded border border-neutral-100 dark:border-neutral-800">
          <table className="w-full min-w-[640px] text-sm">
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
              {filteredRecentSites.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-sm text-neutral-400 dark:text-neutral-500"
                  >
                    {stats.recentSites.length === 0
                      ? "No sites yet."
                      : "No rows match your search."}
                  </td>
                </tr>
              ) : (
                filteredRecentSites.map((site) => (
                  <tr
                    key={site.id}
                    className="border-b border-neutral-50 last:border-0 dark:border-neutral-800/80"
                  >
                    <td className="px-3 py-2 text-xs font-medium">
                      <a
                        href={`https://${site.subdomain}.${siteDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-950 underline-offset-2 hover:underline dark:text-neutral-50"
                        aria-label={`Open ${site.subdomain}.${siteDomain} in a new tab`}
                      >
                        {site.subdomain}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <a
                        href={`https://www.are.na/channel/${site.channelSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-50"
                        aria-label={`Open Are.na channel ${site.channelTitle}`}
                      >
                        {site.channelTitle}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">{site.template}</td>
                    <td className="px-3 py-2">
                      <PublishStatusBadge published={site.published} />
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">{site.arenaUsername}</td>
                    <td className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">
                      {new Date(site.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <FeaturedToggleButton
                        featured={site.featured}
                        disabled={!!toggling[site.id]}
                        onClick={() => handleToggleFeatured(site)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
        </>
      )}

      {activeTab === "templates" && (
        <section className="space-y-6">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-xl">
            Choose an Are.na channel for each template preview (same picker as creating a site). Public{" "}
            <Link href="/templates" className="underline hover:text-neutral-600 dark:hover:text-neutral-300">
              /templates
            </Link>{" "}
            uses this data.
          </p>
          {!hasExampleToken && (
            <div className="p-3 rounded border border-amber-200 bg-amber-50 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              No Are.na token for examples: set{" "}
              <code className="text-xs">ARENA_EXAMPLE_TOKEN</code> in production, or rely on an admin
              account&apos;s OAuth token in development.
            </div>
          )}
          <div className={SITE_CARD_GRID_CLASS}>
            {filteredTemplateRows.length === 0 ? (
              <p className="col-span-full text-sm text-neutral-400 dark:text-neutral-500">
                {templateExamples.length === 0
                  ? "No templates found."
                  : "No templates match your search."}
              </p>
            ) : (
            filteredTemplateRows.map((t) => (
              <Link
                key={t.id}
                href={`/admin/template-channels/${encodeURIComponent(t.id)}`}
                className="group block border rounded overflow-hidden border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/80 transition-colors dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-900/40"
              >
                <div className="p-4">
                  <p className="text-sm font-medium text-neutral-950 dark:text-neutral-50">{t.name}</p>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 dark:text-neutral-500">
                    {t.description}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-2 font-mono dark:text-neutral-500">
                    {t.id}
                  </p>
                  <p className="text-xs mt-3 text-neutral-600 dark:text-neutral-300">
                    {t.channelTitle ? (
                      <>
                        Example: <span className="font-medium">{t.channelTitle}</span>
                      </>
                    ) : (
                      <span className="text-neutral-400 dark:text-neutral-500">No example channel yet</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-400 mt-2 group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                    Choose channel →
                  </p>
                </div>
              </Link>
            ))
            )}
          </div>
        </section>
      )}

      {activeTab === "featured" && (
        <section>
          {featuredSites.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">No featured sites yet.</p>
          ) : filteredFeaturedSites.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              No featured sites match your search.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredFeaturedSites.map((site) => (
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
                    type="button"
                    onClick={() => handleToggleFeatured(site)}
                    disabled={!!toggling[site.id]}
                    className="text-xs px-2 py-0.5 rounded border border-red-100 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Unfeature
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
