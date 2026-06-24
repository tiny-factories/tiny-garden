"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/track";
import type { ThemeColors, ThemeFonts } from "@/lib/theme-css-tokens";

const MAX_HISTORY = 8;

type HistoryEntry = {
  prompt: string;
  at: number;
  notes: string | null;
};

function historyKey(siteId: string) {
  return `tg.ai-theme.history.${siteId}`;
}

function loadHistory(siteId: string): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyKey(siteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is HistoryEntry =>
          !!entry &&
          typeof entry === "object" &&
          typeof (entry as { prompt?: unknown }).prompt === "string" &&
          typeof (entry as { at?: unknown }).at === "number"
      )
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function saveHistory(siteId: string, entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      historyKey(siteId),
      JSON.stringify(entries.slice(0, MAX_HISTORY))
    );
  } catch {
    /* ignore quota / disabled storage */
  }
}

type ApplyState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "applied"; at: number; notes: string | null }
  | { kind: "error"; message: string };

/**
 * Prompt-driven AI theme editor. Calls `POST /api/sites/[id]/theme/ai`
 * with `apply: true`, which writes the generated tokens to the site and
 * queues a rebuild server-side. Prompt history is per-browser (localStorage)
 * to avoid a schema change for v1.
 */
export function SiteAiThemeBox({
  siteId,
  canCustomize,
  onApplied,
}: {
  siteId: string;
  canCustomize: boolean;
  /** Invoked after the server confirms the theme was written — caller refetches tokens. */
  onApplied?: (result: { colors: ThemeColors; fonts: ThemeFonts; notes: string | null }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<ApplyState>({ kind: "idle" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory(siteId));
  }, [siteId]);

  const pushHistory = useCallback(
    (entry: HistoryEntry) => {
      setHistory((prev) => {
        const next = [entry, ...prev.filter((p) => p.prompt !== entry.prompt)].slice(
          0,
          MAX_HISTORY
        );
        saveHistory(siteId, next);
        return next;
      });
    },
    [siteId]
  );

  const runPrompt = async () => {
    if (!prompt.trim() || state.kind === "running") return;
    setState({ kind: "running" });
    try {
      const res = await fetch(`/api/sites/${siteId}/theme/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), apply: true }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `AI request failed (${res.status})`);
      }
      const data = (await res.json()) as {
        colors: ThemeColors;
        fonts: ThemeFonts;
        customCss: string | null;
        notes: string | null;
        applied: boolean;
      };
      pushHistory({ prompt: prompt.trim(), at: Date.now(), notes: data.notes });
      setState({ kind: "applied", at: Date.now(), notes: data.notes });
      track("ai-theme-applied", { siteId });
      onApplied?.({ colors: data.colors, fonts: data.fonts, notes: data.notes });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "AI request failed",
      });
    }
  };

  if (!canCustomize) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        The AI theme editor is available on Pro and Studio plans.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
          AI theme editor
        </h3>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          edits write tokens + rebuild
        </span>
      </div>

      <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Describe the look. The model returns a cohesive theme — colors and fonts —
        and applies it to your site immediately. You can keep tweaking the values
        below in <code className="font-mono text-[11px]">theme.css</code> after.
      </p>

      <textarea
        value={prompt}
        rows={3}
        placeholder={
          'e.g. "Warm, serif, mid-century book — cream background, deep red accent, generous line height."'
        }
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full resize-y rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void runPrompt()}
          disabled={!prompt.trim() || state.kind === "running"}
          className="inline-flex items-center justify-center rounded border border-neutral-900 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {state.kind === "running" ? "Generating…" : "Apply theme"}
        </button>
        {state.kind === "applied" && (
          <span className="text-[11px] text-green-600 dark:text-green-400">
            Applied · rebuild queued
            {state.notes ? ` · ${state.notes}` : ""}
          </span>
        )}
        {state.kind === "error" && (
          <span className="text-[11px] text-red-600 dark:text-red-400">
            {state.message}
          </span>
        )}
      </div>

      {history.length > 0 && (
        <details className="text-xs text-neutral-500 dark:text-neutral-400">
          <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Recent prompts ({history.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {history.map((entry) => (
              <li key={`${entry.at}-${entry.prompt}`} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setPrompt(entry.prompt)}
                  className="truncate text-left text-xs text-neutral-700 underline-offset-2 hover:underline dark:text-neutral-200"
                  title={entry.prompt}
                >
                  {entry.prompt}
                </button>
                {entry.notes && (
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {entry.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
