"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export interface SiteChannelPickerChannel {
  id: number;
  title: string;
  slug: string;
  length: number;
  counts?: { contents: number };
  updated_at: string;
  visibility?: string;
  owner?: { name?: string; type?: string; slug?: string };
}

interface GroupData {
  id: number;
  slug: string;
  name: string;
  channels: SiteChannelPickerChannel[];
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

function ChannelSkeleton() {
  return (
    <div className="px-3 py-3 border-b border-neutral-100 animate-pulse dark:border-neutral-800">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-3.5 w-40 bg-neutral-100 rounded dark:bg-neutral-800" />
        <div className="h-3 w-12 bg-neutral-50 rounded dark:bg-neutral-900" />
      </div>
      <div className="h-3 w-28 bg-neutral-50 rounded dark:bg-neutral-900" />
    </div>
  );
}

/**
 * Full-page Are.na channel list (same UI as step 1 of /site/new).
 */
export function SiteChannelPicker({
  onSelect,
  cancelHref,
  heading = "Choose a channel",
  highlightChannelSlugs,
  busy = false,
  embedded = false,
  enableCreate = false,
}: {
  onSelect: (channel: SiteChannelPickerChannel) => void;
  cancelHref: string;
  heading?: string;
  /** When set, channels whose slug is in the set show a “Has site” badge (new-site flow). */
  highlightChannelSlugs?: Set<string>;
  busy?: boolean;
  /** Use inside a parent `main` (e.g. admin) — drops outer `min-h-screen` / `main` semantics. */
  embedded?: boolean;
  /** Show a "New channel" inline composer that creates an Are.na channel via our API and selects it. */
  enableCreate?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createStatus, setCreateStatus] = useState<"public" | "closed" | "private">("public");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const submitCreate = async () => {
    const trimmed = createTitle.trim();
    if (!trimmed) {
      setCreateError("Title is required.");
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, status: createStatus }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Create failed (${res.status})`);
      }
      const data = (await res.json()) as { channel: SiteChannelPickerChannel };
      onSelect(data.channel);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreateBusy(false);
    }
  };

  const [ownChannels, setOwnChannels] = useState<SiteChannelPickerChannel[]>([]);
  const [followingChannels, setFollowingChannels] = useState<
    SiteChannelPickerChannel[]
  >([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loadingOwn, setLoadingOwn] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const loading = loadingOwn && ownChannels.length === 0;
  const stillLoading = loadingOwn || loadingGroups || loadingFollowing;

  useEffect(() => {
    fetch("/api/channels?source=own")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const sorted = (data || []).sort(
          (a: SiteChannelPickerChannel, b: SiteChannelPickerChannel) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setOwnChannels(sorted);
      })
      .finally(() => setLoadingOwn(false));

    fetch("/api/channels?source=groups")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setGroups(data || []))
      .finally(() => setLoadingGroups(false));

    fetch("/api/channels?source=following")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFollowingChannels(data || []))
      .finally(() => setLoadingFollowing(false));
  }, []);

  const channels = useMemo(() => {
    if (filter === "own") return ownChannels;
    if (filter === "following") return followingChannels;
    const group = groups.find((g) => g.slug === filter);
    if (group) return group.channels;
    const all = [...ownChannels, ...groups.flatMap((g) => g.channels)];
    const seen = new Set<number>();
    return all
      .filter((ch) => {
        if (seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [ownChannels, followingChannels, groups, filter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter(
      (ch) =>
        (ch.title || "").toLowerCase().includes(q) ||
        (ch.slug || "").toLowerCase().includes(q)
    );
  }, [channels, search]);

  const rootClass = embedded
    ? "flex flex-1 flex-col min-h-0 px-4 pb-8 max-w-2xl mx-auto w-full"
    : "min-h-screen flex flex-col px-4 py-8 max-w-2xl mx-auto";

  return (
    <div className={rootClass}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium">{heading}</h1>
        <div className="flex items-center gap-3">
          {enableCreate && !createOpen && (
            <button
              type="button"
              onClick={() => {
                setCreateOpen(true);
                setCreateError(null);
              }}
              disabled={busy}
              className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
            >
              + New channel
            </button>
          )}
          <Link
            href={cancelHref}
            className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 dark:text-neutral-500"
          >
            Cancel
          </Link>
        </div>
      </div>

      {enableCreate && createOpen && (
        <div className="mb-4 space-y-2 rounded border border-neutral-200 bg-neutral-50/60 p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Create a new Are.na channel
          </div>
          <input
            type="text"
            value={createTitle}
            placeholder="Channel title"
            autoFocus
            onChange={(e) => setCreateTitle(e.target.value)}
            className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-neutral-500 dark:text-neutral-400">Visibility</label>
            <select
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value as typeof createStatus)}
              className="rounded border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="public">Public (anyone)</option>
              <option value="closed">Closed (collaborators only)</option>
              <option value="private">Private (only me)</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void submitCreate()}
              disabled={createBusy || !createTitle.trim()}
              className="inline-flex items-center justify-center rounded border border-neutral-900 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {createBusy ? "Creating…" : "Create channel"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setCreateTitle("");
                setCreateError(null);
              }}
              disabled={createBusy}
              className="inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Cancel
            </button>
            {createError && (
              <span className="text-[11px] text-red-600 dark:text-red-400">{createError}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center border border-neutral-200 rounded mb-4 focus-within:border-neutral-400 transition-colors dark:focus-within:border-neutral-500 dark:border-neutral-700">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-2 py-2 text-sm text-neutral-600 bg-neutral-50 border-r border-neutral-200 rounded-l outline-none dark:border-neutral-700 dark:text-neutral-400 dark:bg-neutral-900"
        >
          <option value="all">All</option>
          <option value="own">Mine</option>
          <option value="following">Following</option>
          {groups.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your channels..."
          autoFocus
          className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
        />
      </div>

      {loading ? (
        <div className="-mx-4 px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ChannelSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 && !stillLoading ? (
        <p className="text-sm text-neutral-400 py-8 text-center dark:text-neutral-500">
          {search ? "No channels match your search." : "No channels found."}
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto -mx-4 px-4">
          {filtered.map((ch) => (
            <button
              key={ch.id}
              type="button"
              disabled={busy}
              onClick={() => onSelect(ch)}
              className="w-full text-left px-3 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors disabled:opacity-50 dark:hover:bg-neutral-800/80 dark:border-neutral-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{ch.title}</span>
                {ch.visibility === "closed" && (
                  <span className="text-[10px] px-1 py-0.5 bg-neutral-100 text-neutral-400 rounded shrink-0 dark:text-neutral-500 dark:bg-neutral-800">
                    Closed
                  </span>
                )}
                {ch.visibility === "private" && (
                  <span className="text-[10px] px-1 py-0.5 bg-neutral-100 text-neutral-400 rounded shrink-0 dark:text-neutral-500 dark:bg-neutral-800">
                    Private
                  </span>
                )}
                {ch.owner?.type === "Group" && (
                  <span className="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-400 rounded shrink-0">
                    {ch.owner.name}
                  </span>
                )}
                {highlightChannelSlugs?.has(ch.slug) && (
                  <span className="text-[10px] px-1 py-0.5 bg-amber-50 text-amber-500 border border-amber-200 rounded shrink-0">
                    Has site
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {ch.counts?.contents || ch.length || 0} blocks &middot;{" "}
                {timeAgo(ch.updated_at)}
              </span>
            </button>
          ))}
          {stillLoading && (
            <div className="py-3 text-center">
              <span className="text-xs text-neutral-400 animate-pulse dark:text-neutral-500">
                Loading more channels...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
