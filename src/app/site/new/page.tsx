"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/track";
import { ButtondownWaitlistForm } from "@/components/buttondown-waitlist-form";
import {
  SiteChannelPicker,
  type SiteChannelPickerChannel,
} from "@/components/site-channel-picker";

interface TemplateMeta {
  name: string;
  description: string;
  id: string;
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

type AccessGate = "loading" | "ok" | "gated";

export default function NewSitePage() {
  const router = useRouter();
  const [accessGate, setAccessGate] = useState<AccessGate>("loading");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selectedChannel, setSelectedChannel] =
    useState<SiteChannelPickerChannel | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subdomain, setSubdomain] = useState("");

  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { betaGated?: boolean }) => {
        if (data.betaGated) setAccessGate("gated");
        else setAccessGate("ok");
      })
      .catch(() => setAccessGate("ok"));
  }, []);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => (r.ok ? r.json() : []))
      .then((sites: { channelSlug: string }[]) => {
        setExistingSlugs(new Set(sites.map((s) => s.channelSlug)));
      });
  }, []);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data: TemplateMeta[]) => {
        setTemplates(Array.isArray(data) ? data : []);
        if (!Array.isArray(data) || data.length === 0) return;
        const preferred = data.find((t) => t.id === "blog");
        setSelectedTemplate(preferred ? preferred.id : data[0].id);
      });
  }, []);

  function handleChannelSelect(channel: SiteChannelPickerChannel) {
    setSelectedChannel(channel);
    track("channel-selected", { channel: channel.slug, blocks: channel.length });
    setSubdomain((s) => s || channel.slug);
  }

  async function handleCreate() {
    if (!selectedChannel) return;
    setCreating(true);
    setError("");

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelSlug: selectedChannel.slug,
        channelTitle: selectedChannel.title,
        template: selectedTemplate,
        subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      }),
    });

    if (res.ok) {
      const site = await res.json();
      track("site-created", {
        template: selectedTemplate,
        channel: selectedChannel.slug,
        subdomain,
      });
      router.push(`/sites?building=${encodeURIComponent(site.id)}`);
    } else {
      const data = await res.json();
      track("site-create-error", { error: data.error || "unknown" });
      setError(data.error || "Failed to create site");
      setCreating(false);
    }
  }

  if (accessGate === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 max-w-md mx-auto text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Checking access…</p>
      </main>
    );
  }

  if (accessGate === "gated") {
    return (
      <main className="min-h-screen flex flex-col px-4 py-16 max-w-md mx-auto">
        <h1 className="text-lg font-medium text-center">Beta is full</h1>
        <p className="text-sm text-neutral-500 mt-3 text-center leading-relaxed dark:text-neutral-400">
          Free beta spots are full. Get notified when we open more, or become a supporter for lifetime access.
        </p>
        <div className="mt-6">
          <ButtondownWaitlistForm idPrefix="new-site-gate" />
        </div>
        <Link
          href="/account"
          className="mt-6 text-center text-sm px-4 py-2 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/80 dark:border-neutral-700"
        >
          Become a supporter
        </Link>
        <Link
          href="/sites"
          className="mt-4 text-center text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 dark:text-neutral-500"
        >
          Back to sites
        </Link>
      </main>
    );
  }

  if (!selectedChannel) {
    return (
      <main className="min-h-screen">
        <SiteChannelPicker
          heading="Choose a channel"
          cancelHref="/sites"
          highlightChannelSlugs={existingSlugs}
          onSelect={handleChannelSelect}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-medium">New site</h1>
        <button
          type="button"
          onClick={() => {
            setSelectedChannel(null);
            setSubdomain("");
          }}
          className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 dark:text-neutral-500"
        >
          Change channel
        </button>
      </div>

      <div className="mb-8 p-3 border border-neutral-900 rounded bg-neutral-50 dark:bg-neutral-900">
        <p className="text-sm font-medium">{selectedChannel.title}</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {selectedChannel.length} blocks &middot;{" "}
          {timeAgo(selectedChannel.updated_at)}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-neutral-500 mb-3 dark:text-neutral-400">
          Choose a template
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplate(t.id)}
              className={`text-left p-3 border rounded text-sm transition-colors ${
                selectedTemplate === t.id
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-100 hover:border-neutral-300"
              }`}
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-neutral-400 mt-1 dark:text-neutral-500">{t.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-neutral-500 mb-3 dark:text-neutral-400">
          Choose a subdomain
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded text-sm flex-1 outline-none focus:border-neutral-400 transition-colors dark:focus:border-neutral-500 dark:border-neutral-700"
            placeholder="my-site"
          />
          <span className="text-sm text-neutral-400 dark:text-neutral-500">.tiny.garden</span>
        </div>
      </section>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        type="button"
        onClick={handleCreate}
        disabled={creating || !subdomain}
        className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {creating ? "Creating..." : "Create & publish"}
      </button>
    </main>
  );
}
