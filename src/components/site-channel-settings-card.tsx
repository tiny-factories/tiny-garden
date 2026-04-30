"use client";

import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/track";

export interface PickableChannel {
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
  channels: PickableChannel[];
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

function ChannelRowSkeleton() {
  return (
    <div className="px-3 py-3 border-b border-neutral-100 animate-pulse dark:border-neutral-800">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-3.5 w-40 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-12 rounded bg-neutral-50 dark:bg-neutral-900" />
      </div>
      <div className="h-3 w-28 rounded bg-neutral-50 dark:bg-neutral-900" />
    </div>
  );
}

interface SiteChannelSettingsCardProps {
  siteId: string;
  channelSlug: string;
  channelTitle: string;
  /** Other sites’ channel slugs (for “Has site” hint). Exclude the current site when building this set. */
  otherSitesChannelSlugs: Set<string>;
  onChannelUpdated: (next: { channelSlug: string; channelTitle: string }) => void;
}

export function SiteChannelSettingsCard({
  siteId,
  channelSlug,
  channelTitle,
  otherSitesChannelSlugs,
  onChannelUpdated,
}: SiteChannelSettingsCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [ownChannels, setOwnChannels] = useState<PickableChannel[]>([]);
  const [followingChannels, setFollowingChannels] = useState<PickableChannel[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loadingOwn, setLoadingOwn] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const loading = loadingOwn && ownChannels.length === 0;
  const stillLoading = loadingOwn || loadingGroups || loadingFollowing;

  useEffect(() => {
    if (!pickerOpen) return;
    setSearch("");
    setFilter("all");
    setError("");
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    fetch("/api/channels?source=own")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const sorted = (data || []).sort(
          (a: PickableChannel, b: PickableChannel) =>
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
  }, [pickerOpen]);

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

  async function applyChannel(ch: PickableChannel) {
    if (ch.slug === channelSlug) {
      setPickerOpen(false);
      return;
    }
    if (
      !window.confirm(
        `Use “${ch.title}” for this site instead? Content will come from that channel and a new build will start.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelSlug: ch.slug }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Could not switch channel."
      );
      setBusy(false);
      return;
    }
    onChannelUpdated({
      channelSlug: data.channelSlug,
      channelTitle: data.channelTitle,
    });
    track("site-channel-changed", {
      siteId,
      channel: data.channelSlug,
    });
    setPickerOpen(false);
    setBusy(false);
  }

  return (
    <div className="rounded p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Channel
        </h3>
        {!pickerOpen ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 text-xs font-medium text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
          >
            Change channel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            disabled={busy}
            className="shrink-0 text-xs font-medium text-neutral-400 underline-offset-2 hover:underline disabled:opacity-50 dark:text-neutral-500"
          >
            Cancel
          </button>
        )}
      </div>

      {!pickerOpen ? (
        <>
          <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-100">
            {channelTitle}
          </p>
          <a
            href={`https://www.are.na/channel/${channelSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-neutral-400 underline underline-offset-2 dark:text-neutral-500"
          >
            View on Are.na
          </a>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
            Pick a channel you can access. Your subdomain stays the same; only the
            Are.na source changes.
          </p>
          <div className="flex items-center overflow-hidden rounded border border-neutral-200 dark:border-neutral-700">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={busy}
              className="border-r border-neutral-200 bg-neutral-50 px-2 py-2 text-sm text-neutral-600 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
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
              placeholder="Search channels…"
              disabled={busy}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
            />
          </div>

          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="max-h-60 overflow-y-auto rounded border border-neutral-100 dark:border-neutral-800">
            {loading ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <ChannelRowSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 && !stillLoading ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
                {search ? "No channels match your search." : "No channels found."}
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((ch) => {
                  const isCurrent = ch.slug === channelSlug;
                  const hasOtherSite = otherSitesChannelSlugs.has(ch.slug);
                  return (
                    <li key={ch.id}>
                      <button
                        type="button"
                        disabled={busy || isCurrent}
                        onClick={() => applyChannel(ch)}
                        className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-neutral-800/80"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-neutral-800 dark:text-neutral-100">
                            {ch.title}
                          </span>
                          {isCurrent ? (
                            <span className="rounded bg-emerald-50 px-1 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                              Current
                            </span>
                          ) : null}
                          {ch.visibility === "closed" ? (
                            <span className="rounded bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-400 dark:bg-neutral-600 dark:text-neutral-300">
                              Closed
                            </span>
                          ) : null}
                          {ch.visibility === "private" ? (
                            <span className="rounded bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-400 dark:bg-neutral-600 dark:text-neutral-300">
                              Private
                            </span>
                          ) : null}
                          {ch.owner?.type === "Group" ? (
                            <span className="rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                              {ch.owner.name}
                            </span>
                          ) : null}
                          {hasOtherSite ? (
                            <span className="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                              Has site
                            </span>
                          ) : null}
                        </div>
                        <span className="mt-0.5 block text-xs text-neutral-400 dark:text-neutral-500">
                          {ch.counts?.contents || ch.length || 0} blocks ·{" "}
                          {timeAgo(ch.updated_at)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {stillLoading && !loading ? (
              <p className="py-2 text-center text-[10px] text-neutral-400 animate-pulse dark:text-neutral-500">
                Loading more channels…
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
