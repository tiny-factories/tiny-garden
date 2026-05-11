"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/track";

/**
 * Subset of `TemplateBlock` returned by `GET /api/sites/[id]/blocks`. Kept
 * narrow so the editor doesn't depend on the build-time shape.
 */
export type EditableBlock = {
  id: number;
  type: "image" | "text" | "link" | "media" | "attachment";
  title: string;
  description: string;
  content: string | null;
  position: number;
  updated_at: string;
  arena_url: string;
  image: { display: string; square: string } | null;
  link: { url: string; title: string; description: string } | null;
  attachment: {
    file_name: string;
    kind: string;
    preview_image_url: string;
  } | null;
  editableFields: Array<"title" | "description" | "content">;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

type DraftMap = Record<number, { title?: string; description?: string; content?: string }>;

type NewBlockKind = "text" | "link" | "image";

type CreateState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string };

function blockTypeLabel(type: EditableBlock["type"]): string {
  switch (type) {
    case "image":
      return "Image";
    case "text":
      return "Text";
    case "link":
      return "Link";
    case "media":
      return "Media";
    case "attachment":
      return "File";
  }
}

function blockPreview(block: EditableBlock): React.ReactNode {
  if (block.image?.display) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={block.image.display}
        alt=""
        className="h-16 w-16 shrink-0 rounded border border-neutral-200 object-cover dark:border-neutral-800"
      />
    );
  }
  if (block.attachment?.preview_image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={block.attachment.preview_image_url}
        alt=""
        className="h-16 w-16 shrink-0 rounded border border-neutral-200 object-cover dark:border-neutral-800"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-neutral-200 text-[10px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
      {blockTypeLabel(block.type)}
    </div>
  );
}

/**
 * Inline editor for a site's Are.na blocks.
 *
 * - Fetches blocks live from Are.na via the local API on mount.
 * - User edits go into a per-block draft. "Save" PATCHes the block on Are.na
 *   and triggers a debounced rebuild server-side.
 * - We refetch the row on success so the UI shows Are.na's canonical state.
 */
export function SiteContentEditor({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [saveState, setSaveState] = useState<Record<number, SaveState>>({});

  const [composerOpen, setComposerOpen] = useState(false);
  const [newKind, setNewKind] = useState<NewBlockKind>("text");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [createState, setCreateState] = useState<CreateState>({ kind: "idle" });

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/blocks`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to load blocks (${res.status})`);
      }
      const data = (await res.json()) as { blocks: EditableBlock[] };
      setBlocks(data.blocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blocks");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const setDraftField = (
    blockId: number,
    field: "title" | "description" | "content",
    value: string
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [blockId]: { ...prev[blockId], [field]: value },
    }));
  };

  const hasDraft = (blockId: number) => {
    const d = drafts[blockId];
    if (!d) return false;
    return (
      typeof d.title === "string" ||
      typeof d.description === "string" ||
      typeof d.content === "string"
    );
  };

  const discardDraft = (blockId: number) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
    setSaveState((prev) => ({ ...prev, [blockId]: { kind: "idle" } }));
  };

  const saveBlock = async (block: EditableBlock) => {
    const draft = drafts[block.id];
    if (!draft) return;

    setSaveState((prev) => ({ ...prev, [block.id]: { kind: "saving" } }));
    try {
      const res = await fetch(`/api/sites/${siteId}/blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      const data = (await res.json()) as {
        block: { id: number; title: string; description: string; content: string | null; updated_at: string };
        rebuildQueued: boolean;
      };
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === block.id
            ? {
                ...b,
                title: data.block.title,
                description: data.block.description ?? "",
                content: data.block.content,
                updated_at: data.block.updated_at,
              }
            : b
        )
      );
      discardDraft(block.id);
      setSaveState((prev) => ({
        ...prev,
        [block.id]: { kind: "saved", at: Date.now() },
      }));
      track("block-edited", { siteId, blockId: block.id, fields: Object.keys(draft).join(",") });
    } catch (err) {
      setSaveState((prev) => ({
        ...prev,
        [block.id]: {
          kind: "error",
          message: err instanceof Error ? err.message : "Save failed",
        },
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-32 items-center justify-center p-6 text-xs text-neutral-500 dark:text-neutral-400">
        Loading blocks from Are.na…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 p-4 text-sm">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void refreshAll()}
          className="inline-flex items-center justify-center rounded border border-neutral-200 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="p-6 text-xs text-neutral-500 dark:text-neutral-400">
        This channel has no blocks yet. Add a block on Are.na and refresh.
      </div>
    );
  }

  const resetComposer = () => {
    setNewTitle("");
    setNewDescription("");
    setNewContent("");
    setNewUrl("");
    setCreateState({ kind: "idle" });
  };

  const createBlock = async () => {
    setCreateState({ kind: "saving" });
    const body: Record<string, unknown> = { type: newKind };
    if (newTitle.trim()) body.title = newTitle.trim();
    if (newDescription.trim()) body.description = newDescription.trim();
    if (newKind === "text") {
      if (!newContent.trim()) {
        setCreateState({ kind: "error", message: "Content is required for a text block." });
        return;
      }
      body.content = newContent;
    } else {
      if (!newUrl.trim()) {
        setCreateState({ kind: "error", message: "URL is required." });
        return;
      }
      body.url = newUrl.trim();
    }

    try {
      const res = await fetch(`/api/sites/${siteId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Create failed (${res.status})`);
      }
      track("block-created", { siteId, kind: newKind });
      resetComposer();
      setComposerOpen(false);
      await refreshAll();
    } catch (err) {
      setCreateState({
        kind: "error",
        message: err instanceof Error ? err.message : "Create failed",
      });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span>{blocks.length} blocks · edits sync to Are.na and queue a rebuild</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setComposerOpen((v) => !v);
              if (composerOpen) resetComposer();
            }}
            className="inline-flex items-center justify-center rounded border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-800/80"
          >
            {composerOpen ? "Cancel" : "Add block"}
          </button>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="inline-flex items-center justify-center rounded border border-neutral-200 px-2 py-0.5 text-[11px] font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/80"
          >
            Refresh
          </button>
        </div>
      </div>

      {composerOpen && (
        <div className="shrink-0 space-y-2 border-b border-neutral-200 bg-neutral-50/60 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex gap-2 text-xs">
            {(["text", "link", "image"] as NewBlockKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setNewKind(kind);
                  setCreateState({ kind: "idle" });
                }}
                className={`rounded border px-2 py-1 font-medium capitalize ${
                  newKind === kind
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800/80"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={newTitle}
            placeholder="Title (optional)"
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />

          {newKind === "text" ? (
            <textarea
              value={newContent}
              placeholder="Body text (Markdown supported on Are.na)"
              rows={4}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full resize-y rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
            />
          ) : (
            <>
              <input
                type="url"
                value={newUrl}
                placeholder={newKind === "image" ? "https://… (image URL)" : "https://…"}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
              />
              <textarea
                value={newDescription}
                placeholder="Description (optional)"
                rows={2}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full resize-y rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
              />
            </>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void createBlock()}
              disabled={createState.kind === "saving"}
              className="inline-flex items-center justify-center rounded border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-800/80"
            >
              {createState.kind === "saving" ? "Adding…" : `Add ${newKind} block`}
            </button>
            {createState.kind === "error" && (
              <span className="text-[11px] text-red-600 dark:text-red-400">{createState.message}</span>
            )}
            {newKind === "image" && (
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                v1 only accepts image URLs.
              </span>
            )}
          </div>
        </div>
      )}
      <ul className="min-h-0 flex-1 divide-y divide-neutral-200 overflow-y-auto dark:divide-neutral-800">
        {blocks.map((block) => {
          const draft = drafts[block.id] || {};
          const state = saveState[block.id] || { kind: "idle" as const };
          const title = draft.title ?? block.title;
          const description = draft.description ?? block.description;
          const content = draft.content ?? block.content ?? "";
          const canSave = hasDraft(block.id) && state.kind !== "saving";

          return (
            <li key={block.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                {blockPreview(block)}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className="font-mono uppercase tracking-wide">{blockTypeLabel(block.type)}</span>
                    <a
                      href={block.arena_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono underline-offset-2 hover:underline"
                    >
                      #{block.id}
                    </a>
                    {block.link?.url ? (
                      <a
                        href={block.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-full truncate underline-offset-2 hover:underline"
                        title={block.link.url}
                      >
                        {block.link.url}
                      </a>
                    ) : null}
                    {block.attachment?.file_name ? (
                      <span className="truncate" title={block.attachment.file_name}>
                        {block.attachment.file_name}
                      </span>
                    ) : null}
                  </div>

                  {block.editableFields.includes("title") && (
                    <label className="block">
                      <span className="sr-only">Title</span>
                      <input
                        type="text"
                        value={title}
                        placeholder="Title"
                        onChange={(e) => setDraftField(block.id, "title", e.target.value)}
                        className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </label>
                  )}

                  {block.editableFields.includes("description") && (
                    <label className="block">
                      <span className="sr-only">Description</span>
                      <textarea
                        value={description}
                        placeholder="Description"
                        rows={2}
                        onChange={(e) => setDraftField(block.id, "description", e.target.value)}
                        className="w-full resize-y rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </label>
                  )}

                  {block.editableFields.includes("content") && (
                    <label className="block">
                      <span className="sr-only">Content</span>
                      <textarea
                        value={content}
                        placeholder="Body (Markdown supported on Are.na)"
                        rows={5}
                        onChange={(e) => setDraftField(block.id, "content", e.target.value)}
                        className="w-full resize-y rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </label>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void saveBlock(block)}
                      disabled={!canSave}
                      className="inline-flex items-center justify-center rounded border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-800/80"
                    >
                      {state.kind === "saving" ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => discardDraft(block.id)}
                      disabled={!hasDraft(block.id) || state.kind === "saving"}
                      className="inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-100"
                    >
                      Discard
                    </button>
                    {state.kind === "saved" && (
                      <span className="text-[11px] text-green-600 dark:text-green-400">
                        Saved · rebuild queued
                      </span>
                    )}
                    {state.kind === "error" && (
                      <span className="text-[11px] text-red-600 dark:text-red-400">
                        {state.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
