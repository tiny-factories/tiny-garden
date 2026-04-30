"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminTemplateExamplesTable } from "@/components/admin-template-examples-table";

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
        <div className="min-w-0 flex-1 space-y-4">
          <h1 className="text-lg font-medium">Template example channels</h1>
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

      <AdminTemplateExamplesTable rows={templates} />
    </main>
  );
}
