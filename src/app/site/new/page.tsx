"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowBigLeft } from "lucide-react";
import { track } from "@/lib/track";
import { SegmentedControl } from "@/components/toolbar";
import { SitePreviewColumn } from "@/components/site-preview-column";
import {
  SiteChannelPicker,
  type SiteChannelPickerChannel,
} from "@/components/site-channel-picker";
import {
  DEFAULT_THEME_COLORS,
  DEFAULT_THEME_FONTS,
  type ThemeColors,
  type ThemeFonts,
} from "@/lib/theme-css-tokens";

const CUSTOM_TEMPLATE_ID = "custom";

type AiThemeSuggestion = {
  colors: ThemeColors;
  fonts: ThemeFonts;
  customCss: string | null;
  notes: string | null;
};

interface TemplateMeta {
  name: string;
  description: string;
  id: string;
}

type CreationMode = "preset" | "ai-custom";

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

export default function NewSitePage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selectedChannel, setSelectedChannel] =
    useState<SiteChannelPickerChannel | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subdomain, setSubdomain] = useState("");

  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set());

  const [creationMode, setCreationMode] = useState<CreationMode>("preset");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<AiThemeSuggestion | null>(
    null
  );
  const [applyAiTheme, setApplyAiTheme] = useState(true);

  const [presetPreviewRev, setPresetPreviewRev] = useState(0);
  const [aiPreviewFetchKey, setAiPreviewFetchKey] = useState(0);
  const [aiPreviewBlobUrl, setAiPreviewBlobUrl] = useState<string | null>(null);
  const aiPreviewObjectUrlRef = useRef<string | null>(null);

  const presetTemplates = useMemo(
    () => templates.filter((t) => t.id !== CUSTOM_TEMPLATE_ID),
    [templates]
  );

  const showAiFork = isAdmin;
  const effectiveMode: CreationMode = isAdmin ? creationMode : "preset";
  const showAiWorkspace = isAdmin && creationMode === "ai-custom";
  const showPresetGrid = !isAdmin || creationMode === "preset";

  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { isAdmin?: boolean }) => {
        if (data.isAdmin) setIsAdmin(true);
      })
      .catch(() => {});
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
        const list = Array.isArray(data) ? data : [];
        setTemplates(list);
        if (list.length === 0) return;
        const nonCustom = list.filter((t) => t.id !== CUSTOM_TEMPLATE_ID);
        const preferred = nonCustom.find((t) => t.id === "blog");
        setSelectedTemplate(
          preferred?.id ?? nonCustom[0]?.id ?? list[0]?.id ?? ""
        );
      });
  }, []);

  const presetTemplatePreviewUrl = useMemo(() => {
    if (!selectedTemplate || showAiWorkspace) return null;
    const params = new URLSearchParams({ template: selectedTemplate });
    params.set("rev", String(presetPreviewRev));
    return `/api/templates/preview?${params.toString()}`;
  }, [selectedTemplate, showAiWorkspace, presetPreviewRev]);

  useEffect(() => {
    if (!showAiWorkspace) {
      if (aiPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(aiPreviewObjectUrlRef.current);
        aiPreviewObjectUrlRef.current = null;
      }
      setAiPreviewBlobUrl(null);
      return;
    }

    let cancelled = false;

    const colors = aiSuggestion?.colors ?? DEFAULT_THEME_COLORS;
    const fonts = aiSuggestion?.fonts ?? DEFAULT_THEME_FONTS;
    const customCss = aiSuggestion?.customCss ?? null;

    (async () => {
      const res = await fetch("/api/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          template: CUSTOM_TEMPLATE_ID,
          bg: colors.background,
          text: colors.text,
          accent: colors.accent,
          border: colors.border,
          headingFont: fonts.heading,
          bodyFont: fonts.body,
          ...(customCss ? { customCss } : {}),
        }),
      });
      if (!res.ok || cancelled) return;
      const blob = await res.blob();
      const nextUrl = URL.createObjectURL(blob);
      if (aiPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(aiPreviewObjectUrlRef.current);
      }
      aiPreviewObjectUrlRef.current = nextUrl;
      setAiPreviewBlobUrl(nextUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [showAiWorkspace, aiSuggestion, aiPreviewFetchKey]);

  useEffect(() => {
    return () => {
      if (aiPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(aiPreviewObjectUrlRef.current);
        aiPreviewObjectUrlRef.current = null;
      }
    };
  }, []);

  const activePreviewUrl = showAiWorkspace ? aiPreviewBlobUrl : presetTemplatePreviewUrl;

  const draftSubdomain = subdomain.trim() || "your-subdomain";
  const draftSite = useMemo(
    () => ({
      subdomain: draftSubdomain,
      channelTitle: selectedChannel?.title ?? "Channel",
      lastBuiltAt: null as string | null,
    }),
    [draftSubdomain, selectedChannel?.title]
  );

  const previewCardDescription = showAiWorkspace
    ? "Sample channel and AI theme until publish. Your plant icon appears after the first build."
    : "Sample channel for this template until publish. Your Are.na channel replaces it after the first build.";

  function handleChannelSelect(channel: SiteChannelPickerChannel) {
    setSelectedChannel(channel);
    track("channel-selected", { channel: channel.slug, blocks: channel.length });
    setSubdomain((s) => s || channel.slug);
  }

  function selectPresetMode() {
    setCreationMode("preset");
    const preferred = presetTemplates.find((t) => t.id === "blog");
    setSelectedTemplate(
      preferred?.id ?? presetTemplates[0]?.id ?? "blog"
    );
  }

  function selectAiCustomMode() {
    setCreationMode("ai-custom");
    setSelectedTemplate(CUSTOM_TEMPLATE_ID);
    setAiError("");
  }

  function handlePreviewRefresh() {
    if (showAiWorkspace) {
      setAiPreviewFetchKey((k) => k + 1);
    } else {
      setPresetPreviewRev((n) => n + 1);
    }
  }

  async function handleSuggestTheme() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/admin/ai-site-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          template: CUSTOM_TEMPLATE_ID,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiError(
          typeof data.error === "string" ? data.error : "Theme generation failed"
        );
        setAiSuggestion(null);
        return;
      }
      setAiSuggestion({
        colors: data.colors,
        fonts: data.fonts,
        customCss: data.customCss ?? null,
        notes: data.notes ?? null,
      });
      setApplyAiTheme(true);
      track("admin-ai-theme-suggested", { template: CUSTOM_TEMPLATE_ID });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCreate() {
    if (!selectedChannel) return;
    setCreating(true);
    setError("");

    const payload: Record<string, unknown> = {
      channelSlug: selectedChannel.slug,
      channelTitle: selectedChannel.title,
      template: selectedTemplate,
      subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    };

    if (
      isAdmin &&
      effectiveMode === "ai-custom" &&
      applyAiTheme &&
      aiSuggestion
    ) {
      payload.initialTheme = {
        colors: aiSuggestion.colors,
        fonts: aiSuggestion.fonts,
        ...(aiSuggestion.customCss
          ? { customCss: aiSuggestion.customCss }
          : {}),
      };
    }

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const site = await res.json();
      track("site-created", {
        template: selectedTemplate,
        channel: selectedChannel.slug,
        subdomain,
        adminAiTheme:
          isAdmin &&
          effectiveMode === "ai-custom" &&
          applyAiTheme &&
          aiSuggestion
            ? 1
            : 0,
      });
      router.push(`/sites?building=${encodeURIComponent(site.id)}`);
    } else {
      const data = await res.json();
      track("site-create-error", { error: data.error || "unknown" });
      setError(data.error || "Failed to create site");
      setCreating(false);
    }
  }

  if (!selectedChannel) {
    return (
      <main className="min-h-0 w-full min-w-0 flex-1">
        <SiteChannelPicker
          heading="Choose a channel"
          cancelHref="/sites"
          highlightChannelSlugs={existingSlugs}
          onSelect={handleChannelSelect}
        />
      </main>
    );
  }

  const leftSectionTitle = showAiWorkspace
    ? "Custom (AI)"
    : "Templates";

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 py-8 sm:px-6">
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 pb-2 sm:flex-1">
            <div className="flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-lg font-medium">
              <Link
                href="/sites"
                className="text-neutral-400 hover:text-neutral-600 shrink-0 inline-flex dark:hover:text-neutral-300 dark:text-neutral-500"
                aria-label="Back to sites"
              >
                <ArrowBigLeft className="size-7" strokeWidth={1.75} aria-hidden />
              </Link>
              <h1 className="min-w-0 text-lg font-medium text-neutral-950 dark:text-neutral-50">
                New site
              </h1>
            </div>
            <p className="mt-1 max-w-full text-xs text-neutral-400 dark:text-neutral-500">
              {selectedChannel.title}
              {" · "}
              {effectiveMode === "ai-custom" ? "custom" : selectedTemplate}
            </p>
          </div>
          {showAiFork ? (
            <SegmentedControl<CreationMode>
              segments={[
                { value: "preset", label: "Preset templates" },
                { value: "ai-custom", label: "Custom (AI)" },
              ]}
              value={creationMode}
              onChange={(mode) => {
                if (mode === "preset") selectPresetMode();
                else selectAiCustomMode();
              }}
              ariaLabel="New site workflow"
              className="w-full max-w-[16rem] shrink-0 sm:w-[16rem] sm:self-end"
              labelClassName="px-3 text-xs font-medium"
            />
          ) : null}
        </div>

        <div className="outline-none flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 md:flex-row md:items-stretch md:gap-6 md:min-h-[min(560px,calc(100vh-10rem))]">
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 md:min-h-0">
              <h2 className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {leftSectionTitle}
              </h2>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
                  {showPresetGrid && (
                    <div>
                      <p className="mb-3 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
                        Pick a layout. The preview updates on the right on desktop.
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {presetTemplates.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTemplate(t.id)}
                            className={`text-left rounded-md border p-3 text-sm transition-colors ${
                              selectedTemplate === t.id
                                ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-900/80"
                                : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-500"
                            }`}
                          >
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">
                              {t.name}
                            </p>
                            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                              {t.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {showAiWorkspace && (
                    <div className="space-y-4">
                      <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
                        Template type is <span className="font-medium text-neutral-600 dark:text-neutral-400">Custom</span>
                        . Describe the mood; we generate theme tokens and optional layout CSS. Use{" "}
                        <span className="font-medium">Update preview</span> to refresh the frame.
                      </p>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={10}
                        placeholder="e.g. Dark editorial, high contrast, monospace accents for a research reading room…"
                        className="w-full min-h-[200px] rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/40 dark:focus:border-neutral-500"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSuggestTheme}
                          disabled={aiLoading || !aiPrompt.trim()}
                          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
                        >
                          {aiLoading ? "Generating…" : "Update preview"}
                        </button>
                        {aiSuggestion ? (
                          <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <input
                              type="checkbox"
                              checked={applyAiTheme}
                              onChange={(e) => setApplyAiTheme(e.target.checked)}
                            />
                            Save generated theme when creating
                          </label>
                        ) : null}
                      </div>
                      {aiError ? (
                        <p className="text-xs text-red-500">{aiError}</p>
                      ) : null}
                      {aiSuggestion ? (
                        <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50/90 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-900/50">
                          {aiSuggestion.notes ? (
                            <p className="italic text-neutral-600 dark:text-neutral-400">
                              {aiSuggestion.notes}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="shrink-0 text-neutral-500">Tokens</span>
                            {(
                              [
                                ["bg", aiSuggestion.colors.background],
                                ["text", aiSuggestion.colors.text],
                                ["accent", aiSuggestion.colors.accent],
                                ["border", aiSuggestion.colors.border],
                              ] as const
                            ).map(([label, hex]) => (
                              <span
                                key={label}
                                title={`${label}: ${hex}`}
                                className="inline-flex items-center gap-1 overflow-hidden rounded border border-neutral-200 dark:border-neutral-600"
                              >
                                <span
                                  className="block h-6 w-6"
                                  style={{ backgroundColor: hex }}
                                />
                                <span className="pr-1.5 font-mono text-[10px] text-neutral-500">
                                  {hex}
                                </span>
                              </span>
                            ))}
                          </div>
                          <p className="text-neutral-500">
                            Fonts — heading{" "}
                            <code className="text-neutral-800 dark:text-neutral-200">
                              {aiSuggestion.fonts.heading}
                            </code>
                            {" · "}
                            body{" "}
                            <code className="text-neutral-800 dark:text-neutral-200">
                              {aiSuggestion.fonts.body}
                            </code>
                          </p>
                          {aiSuggestion.customCss ? (
                            <details className="text-neutral-500">
                              <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
                                Layout CSS ({aiSuggestion.customCss.length} chars)
                              </summary>
                              <pre className="mt-2 max-h-36 overflow-x-auto overflow-y-auto rounded bg-neutral-100 p-2 text-[10px] leading-relaxed dark:bg-neutral-950">
                                {aiSuggestion.customCss}
                              </pre>
                            </details>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div>
                    <h3 className="mb-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Subdomain
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                        className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 dark:border-neutral-700 dark:focus:border-neutral-500"
                        placeholder="my-site"
                      />
                      <span className="shrink-0 text-sm text-neutral-400 dark:text-neutral-500">
                        .tiny.garden
                      </span>
                    </div>
                  </div>

                  {error ? (
                    <p className="text-sm text-red-500">{error}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !subdomain.trim()}
                    className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
                  >
                    {creating ? "Creating…" : "Create & publish"}
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden min-h-0 w-full min-w-0 flex-1 flex-col gap-2 md:flex md:min-h-0">
              <h2 className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Preview
              </h2>
              <SitePreviewColumn
                site={draftSite}
                iconSvg={null}
                iconLoading={false}
                previewUrl={activePreviewUrl}
                onPreviewRefresh={handlePreviewRefresh}
                showPollinator={false}
                iconGrowCycle={0}
                iconVersion={0}
                iconSproutPulse={false}
                columnClassName="flex w-full min-w-0 min-h-0 flex-1 flex-col gap-3"
                dashboardPreview
                previewCardDescription={previewCardDescription}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
