"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  SiteChannelPicker,
  type SiteChannelPickerChannel,
} from "@/components/site-channel-picker";

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  channelSlug: string | null;
  channelTitle: string | null;
}

export default function AdminTemplateChannelPickPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = decodeURIComponent(
    typeof params.templateId === "string" ? params.templateId : ""
  );

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

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
        if (!data?.templates) {
          setNotFound(true);
          return;
        }
        const row = (data.templates as TemplateRow[]).find((t) => t.id === templateId);
        if (!row) setNotFound(true);
        else setTemplate(row);
      })
      .finally(() => setLoading(false));
  }, [router, templateId]);

  async function handleSelect(ch: SiteChannelPickerChannel) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/template-channels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateSlug: templateId, channelSlug: ch.slug }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Could not save example channel"
      );
      return;
    }
    router.push("/admin/template-channels");
  }

  async function handleClear() {
    setClearing(true);
    setError(null);
    const res = await fetch("/api/admin/template-channels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateSlug: templateId, channelSlug: "" }),
    });
    const data = await res.json().catch(() => ({}));
    setClearing(false);
    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Could not remove example"
      );
      return;
    }
    router.push("/admin/template-channels");
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading…</p>
      </main>
    );
  }

  if (notFound || !template) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Template not found.</p>
        <Link
          href="/admin/template-channels"
          className="text-sm mt-4 inline-block text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          ← Back to templates
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="max-w-2xl mx-auto px-4 pt-8 shrink-0 w-full">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <Link
              href="/admin/template-channels"
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              ← All templates
            </Link>
            <p className="text-sm text-neutral-500 mt-2 dark:text-neutral-400">
              Pick a channel for the{" "}
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{template.name}</span>{" "}
              preview (<code className="text-[11px]">{template.id}</code>).
            </p>
            {template.channelTitle && (
              <p className="text-xs text-neutral-500 mt-2 dark:text-neutral-400">
                Current example: <span className="font-medium">{template.channelTitle}</span>
                {" · "}
                <button
                  type="button"
                  disabled={clearing || saving}
                  onClick={handleClear}
                  className="text-neutral-400 underline hover:text-neutral-700 disabled:opacity-50 dark:hover:text-neutral-200"
                >
                  Remove
                </button>
              </p>
            )}
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600 mb-4 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
      <SiteChannelPicker
        embedded
        heading="Choose a channel"
        cancelHref="/admin/template-channels"
        busy={saving || clearing}
        onSelect={handleSelect}
      />
    </main>
  );
}
