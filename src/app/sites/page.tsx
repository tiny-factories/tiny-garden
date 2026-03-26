"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/track";

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

  useEffect(() => {
    Promise.all([
      fetch("/api/sites").then((r) => r.json()),
      fetch("/api/account").then((r) => r.json()),
    ])
      .then(([sitesData, accountData]) => {
        setSites(sitesData);
        setAccount(accountData);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleTogglePublish(site: Site) {
    setBuilding((b) => ({ ...b, [site.id]: true }));
    if (site.published) {
      // Unpublish
      await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: false }),
      });
      const updated = await fetch("/api/sites").then((r) => r.json());
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
      const updated = await fetch("/api/sites").then((r) => r.json());
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

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-lg font-medium">Your sites</h1>
          {account && (
            <p className="text-xs text-neutral-400 mt-1">
              {sites.length} / {account.isAdmin || account.isFriend ? "∞" : account.plan === "studio" ? "50" : account.plan === "pro" ? "10" : "3"}
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
            <div key={i} className="p-4 border border-neutral-100 rounded animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3.5 w-36 bg-neutral-100 rounded" />
                  <div className="h-3 w-52 bg-neutral-50 rounded" />
                </div>
                <div className="h-5 w-9 bg-neutral-100 rounded-full" />
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-50">
                <div className="h-6 w-16 bg-neutral-50 rounded" />
                <div className="h-6 w-14 bg-neutral-50 rounded" />
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
        <div className="space-y-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="border border-neutral-100 rounded overflow-hidden"
            >
              {/* Preview iframe — shown when published */}
              {site.published && (
                <a
                  href={`/api/serve/${site.subdomain}`}
                  target="_blank"
                  rel="noopener"
                  className="block relative bg-neutral-50 group cursor-pointer"
                >
                  <div className="aspect-[16/9] overflow-hidden">
                    <iframe
                      src={`/api/serve/${site.subdomain}`}
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
              )}

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{site.channelTitle}</p>
                    <p className="text-xs text-neutral-400">
                      {site.subdomain}.{siteDomain} &middot; {site.template}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={site.published}
                      loading={!!building[site.id]}
                      onChange={() => handleTogglePublish(site)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-50">
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
          ))}
        </div>
      )}
    </main>
  );
}
