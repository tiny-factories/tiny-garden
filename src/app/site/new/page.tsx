"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/track";

interface Channel {
  id: number;
  title: string;
  slug: string;
  length: number;
  updated_at: string;
}

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

interface GroupData {
  id: number;
  slug: string;
  name: string;
  channels: Channel[];
}

export default function NewSitePage() {
  const router = useRouter();
  const [ownChannels, setOwnChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subdomain, setSubdomain] = useState("");

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        if (data.length > 0) setSelectedTemplate(data[0].id);
      });
  }, []);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => {
        const own = (data.own || []).sort(
          (a: Channel, b: Channel) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setOwnChannels(own);
        setGroups(data.groups || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const channels = useMemo(() => {
    if (filter === "own") return ownChannels;
    const group = groups.find((g) => g.slug === filter);
    if (group) return group.channels;
    // "all" — deduplicated merge
    const all = [...ownChannels, ...groups.flatMap((g) => g.channels)];
    const seen = new Set<number>();
    return all
      .filter((ch) => {
        if (seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
      })
      .sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [ownChannels, groups, filter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter(
      (ch) =>
        (ch.title || "").toLowerCase().includes(q) ||
        (ch.slug || "").toLowerCase().includes(q)
    );
  }, [channels, search]);

  function handleChannelSelect(channel: Channel) {
    setSelectedChannel(channel);
    track("channel-selected", { channel: channel.slug, blocks: channel.length });
    if (!subdomain) {
      setSubdomain(channel.slug);
    }
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
      track("site-created", { template: selectedTemplate, channel: selectedChannel.slug, subdomain });
      await fetch(`/api/sites/${site.id}/build`, { method: "POST" });
      router.push("/sites");
    } else {
      const data = await res.json();
      track("site-create-error", { error: data.error || "unknown" });
      setError(data.error || "Failed to create site");
      setCreating(false);
    }
  }

  // Step 1: Full-page channel picker
  if (!selectedChannel) {
    return (
      <main className="min-h-screen flex flex-col px-4 py-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-medium">Choose a channel</h1>
          <Link
            href="/sites"
            className="text-sm text-neutral-400 hover:text-neutral-600"
          >
            Cancel
          </Link>
        </div>

        <div className="flex items-center border border-neutral-200 rounded mb-4 focus-within:border-neutral-400 transition-colors">
          {groups.length > 0 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-2 text-sm text-neutral-600 bg-neutral-50 border-r border-neutral-200 rounded-l outline-none"
            >
              <option value="all">All</option>
              <option value="own">Mine</option>
              {groups.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            autoFocus
            className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
          />
        </div>

        {loading ? (
          <p className="text-sm text-neutral-400 py-8 text-center">
            Loading channels...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 py-8 text-center">
            {search ? "No channels match your search." : "No channels found."}
          </p>
        ) : (
          <div className="flex-1 overflow-y-auto -mx-4 px-4">
            {filtered.map((ch) => (
              <button
                key={ch.id}
                onClick={() => handleChannelSelect(ch)}
                className="w-full text-left px-3 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors flex items-baseline justify-between gap-4"
              >
                <span className="text-sm font-medium truncate">
                  {ch.title}
                </span>
                <span className="text-xs text-neutral-400 shrink-0">
                  {ch.length} blocks &middot; {timeAgo(ch.updated_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // Steps 2 & 3: Template + subdomain
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-medium">New site</h1>
        <button
          onClick={() => {
            setSelectedChannel(null);
            setSubdomain("");
          }}
          className="text-sm text-neutral-400 hover:text-neutral-600"
        >
          Change channel
        </button>
      </div>

      <div className="mb-8 p-3 border border-neutral-900 rounded bg-neutral-50">
        <p className="text-sm font-medium">{selectedChannel.title}</p>
        <p className="text-xs text-neutral-400">
          {selectedChannel.length} blocks &middot;{" "}
          {timeAgo(selectedChannel.updated_at)}
        </p>
      </div>

      {/* Step 2: Pick template */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-neutral-500 mb-3">
          Choose a template
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`text-left p-3 border rounded text-sm transition-colors ${
                selectedTemplate === t.id
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-100 hover:border-neutral-300"
              }`}
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-neutral-400 mt-1">{t.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Step 3: Subdomain */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-neutral-500 mb-3">
          Choose a subdomain
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded text-sm flex-1 outline-none focus:border-neutral-400 transition-colors"
            placeholder="my-site"
          />
          <span className="text-sm text-neutral-400">.tiny.garden</span>
        </div>
      </section>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={creating || !subdomain}
        className="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {creating ? "Creating..." : "Create & publish"}
      </button>
    </main>
  );
}
