"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SITE_CARD_GRID_CLASS } from "@/lib/site-card-grid";

interface Row {
  id: string;
  name: string;
  description: string;
  channelSlug: string | null;
  channelTitle: string | null;
  updatedAt: string | null;
}

export default function AdminTemplateChannelsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasExampleToken, setHasExampleToken] = useState(false);
  const [templates, setTemplates] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/admin/template-channels", { credentials: "same-origin" })
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        if (r.status === 403) {
          router.push("/sites");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.templates) return;
        setHasExampleToken(!!data.hasExampleToken);
        setTemplates(data.templates);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-lg font-medium">Template example channels</h1>
          <p className="text-xs text-neutral-400 mt-1 dark:text-neutral-500 max-w-xl">
            Choose a template, then pick an Are.na channel — same picker as creating a site. Public{" "}
            <Link href="/templates" className="underline hover:text-neutral-600 dark:hover:text-neutral-300">
              /templates
            </Link>{" "}
            previews use that channel.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm shrink-0 px-3 py-1.5 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/80 dark:border-neutral-700"
        >
          Admin home
        </Link>
      </div>

      {!hasExampleToken && (
        <div className="mb-6 p-3 rounded border border-amber-200 bg-amber-50 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          No Are.na token for examples: set{" "}
          <code className="text-xs">ARENA_EXAMPLE_TOKEN</code> in production, or rely on an admin
          account&apos;s OAuth token in development.
        </div>
      )}

      <div className={SITE_CARD_GRID_CLASS}>
        {templates.map((t) => (
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
        ))}
      </div>
    </main>
  );
}
