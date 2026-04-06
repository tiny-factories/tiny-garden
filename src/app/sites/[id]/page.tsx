"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowBigLeft, ChevronDown, RefreshCw } from "lucide-react";
import { track } from "@/lib/track";
import { SearchInput } from "@/components/search-input";
import { IdeTextEditor } from "@/components/ide-text-editor";
import { ThemeTokensPillEditor } from "@/components/theme-tokens-pill-editor";
import { SegmentedControl } from "@/components/toolbar";
import { SiteChannelSettingsCard } from "@/components/site-channel-settings-card";
import { SiteSettingsSkeleton } from "@/components/sites-dashboard-skeletons";
import {
  DEFAULT_THEME_COLORS,
  DEFAULT_THEME_FONTS,
  formatThemeCss,
  parseThemeCss,
  type ThemeColors,
  type ThemeFonts,
} from "@/lib/theme-css-tokens";
import { PIXEL_POLLINATOR_SVG } from "@/lib/garden-icon";

interface Site {
  id: string;
  subdomain: string;
  channelSlug: string;
  channelTitle: string;
  template: string;
  published: boolean;
  featured: boolean;
  customDomain: string | null;
  domainVerified: boolean;
  lastBuiltAt: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string;
}

interface AccountInfo {
  isAdmin: boolean;
  isFriend: boolean;
  plan: string;
}

const DEFAULT_COLORS = DEFAULT_THEME_COLORS;
const DEFAULT_FONTS = DEFAULT_THEME_FONTS;

type SettingsTab = "settings" | "theme";

type ThemeFileTab = "theme-css" | "styles-css";

/** Search + compact listbox; pointer hover updates sample preview without committing selection. */
function TemplatePickerField({
  templates,
  filteredTemplates,
  selectedTemplate,
  onSelect,
  configSearch,
  onConfigSearchChange,
  onPreviewHover,
}: {
  templates: Template[];
  filteredTemplates: Template[];
  selectedTemplate: string;
  onSelect: (id: string) => void;
  configSearch: string;
  onConfigSearchChange: (value: string) => void;
  onPreviewHover: (templateId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const dropdownTemplates = useMemo(() => {
    if (!selectedTemplate || filteredTemplates.some((t) => t.id === selectedTemplate)) {
      return filteredTemplates;
    }
    const current = templates.find((t) => t.id === selectedTemplate);
    return current ? [current, ...filteredTemplates] : filteredTemplates;
  }, [filteredTemplates, selectedTemplate, templates]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        onPreviewHover(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onPreviewHover]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onPreviewHover(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onPreviewHover]);

  const selectedMeta = templates.find((t) => t.id === selectedTemplate);

  return (
    <div ref={rootRef} className="space-y-2">
      <SearchInput
        value={configSearch}
        onChange={(e) => onConfigSearchChange(e.target.value)}
        placeholder="Search templates…"
        aria-label="Search templates"
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-sm outline-none transition-colors hover:border-neutral-300 focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:border-neutral-600 dark:focus:border-neutral-500"
        >
          <span className="min-w-0 truncate font-medium text-neutral-900 dark:text-neutral-100">
            {selectedMeta?.name ?? "Choose template"}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500 ${open ? "rotate-180" : ""}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        {open ? (
          <ul
            role="listbox"
            aria-label="Templates"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
            onMouseLeave={() => onPreviewHover(null)}
          >
            {dropdownTemplates.length === 0 ? (
              <li className="px-3 py-2 text-xs text-neutral-400 dark:text-neutral-500">No templates match.</li>
            ) : (
              dropdownTemplates.map((t) => (
                <li key={t.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={t.id === selectedTemplate}
                    onPointerEnter={() => onPreviewHover(t.id)}
                    onClick={() => {
                      onSelect(t.id);
                      setOpen(false);
                      onPreviewHover(null);
                    }}
                    className={`w-full border-b border-neutral-100 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/80 ${
                      t.id === selectedTemplate ? "bg-neutral-50 dark:bg-neutral-800/60" : ""
                    }`}
                  >
                    <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{t.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
                      {t.description}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      {selectedMeta?.description ? (
        <p className="text-xs leading-snug text-neutral-400 dark:text-neutral-500">{selectedMeta.description}</p>
      ) : null}
    </div>
  );
}

/** Pixel bee — same 1×1 rects + crispEdges as procedural plant icons. */
function PollinatorBee({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: PIXEL_POLLINATOR_SVG }}
      aria-hidden
    />
  );
}

/** Square frame for procedural plant SVG (preview + settings). */
function PlantIconFrame({
  svg,
  sizeClass = "w-16 h-16",
  className,
  decorative,
  growing,
  growCycleKey = 0,
  iconVersion = 0,
  sproutActive = false,
  showPollinator,
}: {
  svg: string | null;
  sizeClass?: string;
  /** Extra classes (e.g. tighter padding for fake browser chrome). */
  className?: string;
  /** Hide from assistive tech when purely visual (e.g. fake tab favicon). */
  decorative?: boolean;
  /** Germinating motion while a new icon is generating. */
  growing?: boolean;
  /** Bumps when “Grow” starts so layered stem/bloom animation replays on the current icon. */
  growCycleKey?: number;
  /** Bumps when a new SVG returns (remount + sprout playback). */
  iconVersion?: number;
  /** One-shot layer sprout after regrow (mutually exclusive with `growing` in UI). */
  sproutActive?: boolean;
  /** Friend, featured site, or paid plan — tiny bee by the plant. */
  showPollinator?: boolean;
}) {
  const extra = className ? ` ${className}` : "";
  const a11y = decorative ? ({ "aria-hidden": true } as const) : {};
  const growingCls = growing
    ? " border-emerald-300/90 shadow-[0_0_14px_rgba(16,185,129,0.22)]"
    : "";
  const plantMotionCls = [
    growing ? "plant-icon--growing" : "",
    sproutActive && !growing ? "plant-icon--sprout" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!svg) {
    return (
      <div
        className={`relative shrink-0 aspect-square ${sizeClass} overflow-visible border border-neutral-200 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-900 animate-pulse${growing ? " border-emerald-200/80 dark:border-emerald-800/50" : ""}${extra}`}
        {...a11y}
      >
        {showPollinator && !growing && (
          <PollinatorBee className="absolute -top-0.5 -right-0.5 w-[34%] max-w-[20px] aspect-[7/6] max-h-[18px] animate-[bee-gentle_2.8s_ease-in-out_infinite]" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 aspect-square ${sizeClass} border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 flex items-center justify-center p-1 [&_svg]:block [&_svg]:size-full [&_svg]:max-h-full [&_svg]:max-w-full transition-[border-color,box-shadow] duration-300 overflow-visible${growingCls} ${plantMotionCls}${extra}`}
      {...a11y}
    >
      <div
        key={`plant-${growCycleKey}-${iconVersion}`}
        className="flex items-center justify-center size-full min-h-0 [&_svg]:block [&_svg]:size-full [&_svg]:max-h-full [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {showPollinator && !growing && (
        <span
          className="pointer-events-none absolute -top-1 -right-1 z-10 select-none"
          aria-hidden
        >
          <PollinatorBee className="w-[34%] max-w-[22px] min-w-[12px] aspect-[7/6] animate-[bee-gentle_2.8s_ease-in-out_infinite]" />
        </span>
      )}
    </div>
  );
}

function SitePreviewColumn({
  site,
  iconSvg,
  iconLoading,
  previewUrl,
  onPreviewRefresh,
  showPollinator,
  iconGrowCycle,
  iconVersion,
  iconSproutPulse,
  columnClassName = "flex w-full min-w-0 flex-1 min-h-0 flex-col gap-3",
  /** Dashboard: sample-channel preview with saved theme + customCss from DB (not the last production build). */
  dashboardPreview = false,
}: {
  site: Site;
  iconSvg: string | null;
  iconLoading: boolean;
  previewUrl: string | null;
  /** Bump preview cache-bust rev + refetch HTML (live or template preview). */
  onPreviewRefresh?: () => void;
  showPollinator: boolean;
  iconGrowCycle: number;
  iconVersion: number;
  iconSproutPulse: boolean;
  columnClassName?: string;
  dashboardPreview?: boolean;
}) {
  const [previewFrameReady, setPreviewFrameReady] = useState(false);
  const [reloadSpinning, setReloadSpinning] = useState(false);

  useEffect(() => {
    setPreviewFrameReady(false);
  }, [previewUrl]);

  useEffect(() => {
    if (!reloadSpinning) return;
    const t = window.setTimeout(() => setReloadSpinning(false), 12_000);
    return () => window.clearTimeout(t);
  }, [reloadSpinning]);

  return (
    <div className={columnClassName}>
      <div className="shrink-0 border border-neutral-200 rounded-lg p-3 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 dark:text-neutral-500">
          {dashboardPreview ? "Site preview" : site.lastBuiltAt ? "Live site" : "Share preview"}
        </p>
        <div className="flex gap-3">
          <PlantIconFrame
            svg={iconSvg}
            sizeClass="w-14 h-14"
            growing={iconLoading}
            growCycleKey={iconGrowCycle}
            iconVersion={iconVersion}
            sproutActive={iconSproutPulse}
            showPollinator={showPollinator}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-neutral-400 truncate dark:text-neutral-500">
              {site.subdomain}.tiny.garden
            </p>
            <p className="text-sm font-medium text-neutral-800 truncate dark:text-neutral-200">
              {site.channelTitle}
            </p>
            <p className="text-xs text-neutral-500 mt-1 leading-snug dark:text-neutral-400">
              {dashboardPreview
                ? "Sample channel content with your current theme and saved custom CSS. Rebuild to update the public site."
                : "Same square icon attached to this site in the preview page's social metadata."}
            </p>
          </div>
        </div>
      </div>
      <div
        className={`flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow] duration-300 dark:bg-neutral-900 ${
          iconLoading
            ? "border-emerald-200/80 dark:border-emerald-800/50 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
            : "border-neutral-200 dark:border-neutral-700"
        }`}
      >
        <div
          className={`flex items-center gap-2 px-3 py-2 border-b transition-colors duration-300 ${
            iconLoading
              ? "border-emerald-100/90 dark:border-emerald-900/40 bg-linear-to-r from-emerald-50/90 via-neutral-50 to-emerald-50/70 dark:from-emerald-950/50 dark:via-neutral-900 dark:to-emerald-950/40"
              : "border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
          }`}
        >
          <div
            className="group/traffic flex items-center gap-1.5 shrink-0"
            aria-hidden
          >
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                iconLoading
                  ? "bg-emerald-400/70"
                  : "bg-neutral-300 dark:bg-neutral-600 group-hover/traffic:bg-[#ff5f57] dark:group-hover/traffic:bg-[#ff5f57]"
              }`}
            />
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                iconLoading
                  ? "bg-emerald-400/50"
                  : "bg-neutral-300 dark:bg-neutral-600 group-hover/traffic:bg-[#ffbd2e] dark:group-hover/traffic:bg-[#ffbd2e]"
              }`}
            />
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                iconLoading
                  ? "bg-emerald-300/60"
                  : "bg-neutral-300 dark:bg-neutral-600 group-hover/traffic:bg-[#28c840] dark:group-hover/traffic:bg-[#28c840]"
              }`}
            />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <PlantIconFrame
              svg={iconSvg}
              sizeClass="w-4 h-4"
              className="p-0.5! rounded-[3px] border-neutral-200/90 dark:border-neutral-600/90"
              decorative
              growing={iconLoading}
              growCycleKey={iconGrowCycle}
              iconVersion={iconVersion}
              sproutActive={iconSproutPulse}
            />
            <span
              className={`text-[10px] min-w-0 flex-1 truncate transition-colors duration-300 ${
                iconLoading ? "text-emerald-800/80 dark:text-emerald-200/80" : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              {site.subdomain}.tiny.garden
            </span>
            {iconLoading && (
              <span className="text-[10px] text-emerald-700/80 shrink-0 font-medium whitespace-nowrap">
                · growing…
              </span>
            )}
          </div>
          {previewUrl ? (
            <button
              type="button"
              onClick={() => {
                setReloadSpinning(true);
                onPreviewRefresh?.();
              }}
              className="shrink-0 rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200/80 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label="Reload site preview"
              aria-busy={reloadSpinning}
              title="Fetch latest preview"
            >
              <RefreshCw
                className={`size-3.5 ${reloadSpinning ? "animate-spin" : ""}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          ) : null}
        </div>
        {previewUrl ? (
          <div className="relative min-h-0 w-full min-w-0 flex-1">
            {!previewFrameReady && (
              <div
                className="pointer-events-none absolute inset-0 z-[1] min-h-[12rem] bg-linear-to-b from-neutral-100 via-neutral-100/95 to-neutral-200/85 animate-pulse dark:from-neutral-800 dark:via-neutral-800/95 dark:to-neutral-900/90"
                aria-hidden
              />
            )}
            <iframe
              key={previewUrl}
              src={previewUrl}
              onLoad={() => {
                setPreviewFrameReady(true);
                setReloadSpinning(false);
              }}
              className={`absolute inset-0 z-0 h-full w-full border-0 transition-[filter,opacity] duration-300 ${
                iconLoading ? "opacity-55 saturate-75" : "opacity-100"
              }`}
              title="Site preview"
            />
            {iconLoading && (
              <div
                className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-end gap-2 pb-10 px-4 bg-linear-to-t from-emerald-100/55 via-emerald-50/15 to-transparent animate-[plant-preview-mist_1.8s_ease-in-out_infinite]"
                aria-hidden
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-medium text-emerald-900/75 tracking-tight">
                    Sprouting a new icon
                  </span>
                  <span className="text-[10px] text-emerald-800/55">
                    Favicon & preview will match when done
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[min(16rem,40vh)] flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-neutral-400 dark:text-neutral-500 md:min-h-0">
            <span>Select a template to preview</span>
            {dashboardPreview ? (
              <span className="text-xs text-neutral-400/90 dark:text-neutral-500">
                Saved theme and custom CSS load here; choose a template under Settings if this stays empty.
              </span>
            ) : !site.lastBuiltAt ? (
              <span className="text-xs text-neutral-400/90 dark:text-neutral-500">
                After your first build finishes, this frame shows your real site.
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function SiteSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [themeCssDraft, setThemeCssDraft] = useState(() =>
    formatThemeCss(DEFAULT_COLORS, DEFAULT_FONTS)
  );
  const [themeCssError, setThemeCssError] = useState("");
  const [fonts, setFonts] = useState<ThemeFonts>(DEFAULT_FONTS);
  const [loading, setLoading] = useState(true);
  const [userSites, setUserSites] = useState<Site[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");
  const [domainInput, setDomainInput] = useState("");
  const [domainStatus, setDomainStatus] = useState<{
    domain: string | null;
    verified: boolean;
    misconfigured?: boolean | null;
    verification?: { type: string; domain: string; value: string }[];
    config?: { cnames: string[]; aValues: string[] } | null;
  } | null>(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [iconSvg, setIconSvg] = useState<string | null>(null);
  const [iconLoading, setIconLoading] = useState(false);
  const [iconGrowCycle, setIconGrowCycle] = useState(0);
  const [iconVersion, setIconVersion] = useState(0);
  const [iconSproutPulse, setIconSproutPulse] = useState(false);
  const [configSearch, setConfigSearch] = useState("");
  /** Hovered template in picker — drives sample preview only (not saved until you pick + save). */
  const [templatePreviewHover, setTemplatePreviewHover] = useState<string | null>(null);
  const [themeFileTab, setThemeFileTab] = useState<ThemeFileTab>("theme-css");
  const [customCss, setCustomCss] = useState("");
  const [cssSaving, setCssSaving] = useState(false);
  const [cssSaved, setCssSaved] = useState(false);
  /** Bust iframe cache after theme/CSS save so preview reloads with latest DB customCss + query theme. */
  const [previewRev, setPreviewRev] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canCustomize = account?.isAdmin || account?.isFriend || account?.plan === "pro" || account?.plan === "studio";

  /** Friends, homepage-featured sites, team, and paying plans (supporters). */
  const showPollinator = useMemo(() => {
    if (!site || !account) return false;
    return (
      site.featured ||
      account.isFriend ||
      account.isAdmin ||
      account.plan === "pro" ||
      account.plan === "studio"
    );
  }, [site, account]);

  const previewTheme = useMemo(() => {
    const p = parseThemeCss(themeCssDraft);
    if (p.ok) return { colors: p.colors, fonts: p.fonts };
    return { colors, fonts };
  }, [themeCssDraft, colors, fonts]);

  /** When DB + channel have no styles.css, show live theme tokens from the Theme tab until the user edits (then `customCss` holds their source). */
  const stylesCssEditorValue = useMemo(() => {
    if (customCss.trim()) return customCss;
    return formatThemeCss(previewTheme.colors, previewTheme.fonts);
  }, [customCss, previewTheme.colors, previewTheme.fonts]);

  /** Last build — real channel content from generated/blob (not mock data). */
  const rawLivePreviewUrl = useMemo(() => {
    if (!site?.lastBuiltAt || typeof id !== "string") return null;
    const v = encodeURIComponent(site.lastBuiltAt);
    return `/api/sites/${id}/preview/?v=${v}`;
  }, [site?.lastBuiltAt, id]);

  /** Template preview: mock channel + live theme query params + owner customCss from DB (no build yet, or template hover). */
  const rawTemplatePreviewUrl = useMemo(() => {
    const template = templatePreviewHover ?? (selectedTemplate || site?.template);
    if (!template) return null;
    const params = new URLSearchParams({ template });
    if (typeof id === "string") params.set("siteId", id);
    if (canCustomize) {
      params.set("bg", previewTheme.colors.background);
      params.set("text", previewTheme.colors.text);
      params.set("accent", previewTheme.colors.accent);
      params.set("border", previewTheme.colors.border);
      params.set("headingFont", previewTheme.fonts.heading);
      params.set("bodyFont", previewTheme.fonts.body);
    }
    return `/api/templates/preview?${params.toString()}`;
  }, [templatePreviewHover, selectedTemplate, site?.template, previewTheme, canCustomize, id]);

  const previewUsesMockChannel = Boolean(templatePreviewHover != null || !site?.lastBuiltAt);

  const rawPreviewUrl = useMemo(() => {
    const withRev = (base: string) => {
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}rev=${previewRev}`;
    };
    if (templatePreviewHover != null) {
      return rawTemplatePreviewUrl ? withRev(rawTemplatePreviewUrl) : null;
    }
    if (rawLivePreviewUrl) return withRev(rawLivePreviewUrl);
    return rawTemplatePreviewUrl ? withRev(rawTemplatePreviewUrl) : null;
  }, [templatePreviewHover, rawLivePreviewUrl, rawTemplatePreviewUrl, previewRev]);

  const filteredTemplates = useMemo(() => {
    if (!configSearch.trim()) return templates;
    const q = configSearch.toLowerCase();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [templates, configSearch]);

  const otherSitesChannelSlugs = useMemo(
    () =>
      new Set(
        userSites.filter((s) => site && s.id !== site.id).map((s) => s.channelSlug)
      ),
    [userSites, site]
  );

  useEffect(() => {
    if (activeTab !== "settings") setTemplatePreviewHover(null);
  }, [activeTab]);

  const prevPreviewRevRef = useRef(previewRev);
  useEffect(() => {
    const revBumped = prevPreviewRevRef.current !== previewRev;
    prevPreviewRevRef.current = previewRev;
    if (revBumped) {
      setPreviewUrl(rawPreviewUrl);
      return;
    }
    const timeout = setTimeout(() => setPreviewUrl(rawPreviewUrl), 300);
    return () => clearTimeout(timeout);
  }, [rawPreviewUrl, previewRev]);

  useEffect(() => {
    if (!id || typeof id !== "string") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all([
      fetch(`/api/sites`).then((r) => r.json()),
      fetch(`/api/sites/${id}/theme`).then((r) => r.json()),
      fetch("/api/account").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
      fetch(`/api/sites/${id}/domain`).then((r) => r.json()),
      fetch(`/api/sites/${id}/icon`).then((r) => (r.ok ? r.text() : null)),
      fetch(`/api/sites/${id}/css`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sites, theme, acc, tmpls, domain, icon, cssPayload]) => {
        if (cancelled) return;

        const list = Array.isArray(sites) ? sites : [];
        setUserSites(list);
        const s = list.find((x: Site) => x.id === id);
        if (s) {
          setSite(s);
          setSelectedTemplate(s.template);
        }
        if (theme && typeof theme === "object" && "colors" in theme && theme.colors) {
          const tc = theme.colors as ThemeColors;
          const tf =
            theme.fonts && typeof theme.fonts === "object"
              ? (theme.fonts as ThemeFonts)
              : DEFAULT_FONTS;
          setColors(tc);
          setFonts(tf);
          setThemeCssDraft(formatThemeCss(tc, tf));
        }
        if (acc && typeof acc === "object" && !("error" in acc && (acc as { error?: string }).error)) {
          setAccount(acc as AccountInfo);
        }
        if (Array.isArray(tmpls)) {
          setTemplates(tmpls as Template[]);
        }
        if (domain && typeof domain === "object" && !("error" in domain && domain.error)) {
          setDomainStatus(domain);
        }
        if (icon) setIconSvg(icon);
        if (
          cssPayload &&
          typeof cssPayload === "object" &&
          "css" in cssPayload &&
          typeof (cssPayload as { css: unknown }).css === "string"
        ) {
          const loaded = (cssPayload as { css: string }).css;
          const chRaw =
            "channelCss" in cssPayload &&
            typeof (cssPayload as { channelCss: unknown }).channelCss === "string"
              ? (cssPayload as { channelCss: string }).channelCss
              : "";
          if (loaded.trim()) {
            setCustomCss(loaded);
          } else if (chRaw.trim()) {
            setCustomCss(chRaw);
          } else {
            setCustomCss("");
          }
        }
      })
      .catch(() => {
        /* network / parse errors — leave defaults; still exit loading */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave() {
    const parsed = parseThemeCss(themeCssDraft);
    if (!parsed.ok) {
      setThemeCssError(parsed.error);
      return;
    }
    setThemeCssError("");
    setColors(parsed.colors);
    setFonts(parsed.fonts);
    setThemeCssDraft(formatThemeCss(parsed.colors, parsed.fonts));
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/sites/${id}/theme`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colors: parsed.colors, fonts: parsed.fonts }),
    });
    if (res.ok) {
      track("theme-saved", { subdomain: site?.subdomain || "" });
      setSaved(true);
      setPreviewRev((n) => n + 1);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handleSaveCss() {
    if (!id || typeof id !== "string") return;
    setCssSaving(true);
    setCssSaved(false);
    const res = await fetch(`/api/sites/${id}/css`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ css: customCss }),
    });
    if (res.ok) {
      track("custom-css-saved", { subdomain: site?.subdomain || "" });
      setCssSaved(true);
      setPreviewRev((n) => n + 1);
      setTimeout(() => setCssSaved(false), 2000);
    }
    setCssSaving(false);
  }

  async function handleTemplateChange() {
    if (!site || selectedTemplate === site.template) return;
    setSavingTemplate(true);
    setTemplateSaved(false);
    const res = await fetch(`/api/sites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: selectedTemplate }),
    });
    if (res.ok) {
      setSite({ ...site, template: selectedTemplate });
      track("template-changed", { subdomain: site.subdomain, template: selectedTemplate });
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    }
    setSavingTemplate(false);
  }

  async function handleReset() {
    setColors(DEFAULT_COLORS);
    setThemeCssDraft(formatThemeCss(DEFAULT_COLORS, DEFAULT_FONTS));
    setThemeCssError("");
    setFonts(DEFAULT_FONTS);
  }

  async function handleAddDomain() {
    if (!domainInput.trim()) return;
    setDomainLoading(true);
    setDomainError("");
    try {
      const res = await fetch(`/api/sites/${id}/domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDomainError(data.error || "Failed to add domain");
      } else {
        setDomainStatus(data);
        setDomainInput("");
        track("domain-added", { subdomain: site?.subdomain || "", domain: domainInput.trim() });
      }
    } catch {
      setDomainError("Failed to add domain");
    }
    setDomainLoading(false);
  }

  async function handleCheckDomain() {
    setDomainLoading(true);
    try {
      const res = await fetch(`/api/sites/${id}/domain`);
      const data = await res.json();
      if (!data.error) setDomainStatus(data);
    } catch {}
    setDomainLoading(false);
  }

  async function handleRemoveDomain() {
    if (!confirm("Remove custom domain? Your site will only be accessible via its tiny.garden subdomain.")) return;
    setDomainLoading(true);
    try {
      await fetch(`/api/sites/${id}/domain`, { method: "DELETE" });
      setDomainStatus(null);
      setDomainInput("");
      track("domain-removed", { subdomain: site?.subdomain || "" });
    } catch {}
    setDomainLoading(false);
  }

  if (loading) {
    return <SiteSettingsSkeleton />;
  }

  if (!site) {
    return (
      <main className="w-full min-w-0 px-4 py-8 sm:px-6">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">Site not found.</p>
      </main>
    );
  }

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiny.garden";
  const tinyGardenHost = `${site.subdomain}.${siteDomain}`;
  const tinyGardenUrl = `${siteDomain.includes("localhost") ? "http" : "https"}://${tinyGardenHost}`;
  const liveSiteUrl =
    domainStatus?.verified && domainStatus.domain
      ? `https://${domainStatus.domain}`
      : tinyGardenUrl;

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
                  <a
                    href={liveSiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-[15px] tracking-tight text-neutral-950 underline-offset-2 hover:underline dark:text-neutral-50"
                  >
                    {tinyGardenHost}
                  </a>
                </h1>
              </div>
              <p className="mt-1 max-w-full text-xs text-neutral-400 dark:text-neutral-500">
                {site.channelTitle} &middot; {site.template}
              </p>
            </div>
            <SegmentedControl<SettingsTab>
              segments={[
                { value: "settings", label: "Settings" },
                { value: "theme", label: "Theme" },
              ]}
              value={activeTab}
              onChange={setActiveTab}
              ariaLabel="Site settings sections"
              className="w-full max-w-[13.5rem] shrink-0 sm:w-[13.5rem] sm:self-end"
              labelClassName="px-3 text-xs font-medium"
            />
        </div>

        <div className="outline-none flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 md:flex-row md:items-stretch md:gap-6">
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 md:min-h-0">
              <h2 className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {activeTab === "settings" ? "Settings" : "Theme"}
              </h2>
              {activeTab === "settings" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {/* Site Icon — available on all plans */}
              <div>
                <h3 className="text-xs font-medium text-neutral-500 mb-3 dark:text-neutral-400">Site Icon</h3>
                <div className="p-4 rounded">
                  <div className="flex items-center gap-4">
                    <PlantIconFrame
                      svg={iconSvg}
                      sizeClass="w-14 h-14"
                      growing={iconLoading}
                      growCycleKey={iconGrowCycle}
                      iconVersion={iconVersion}
                      sproutActive={iconSproutPulse}
                      showPollinator={showPollinator}
                    />
                    <div>
                      <p className="text-xs text-neutral-500 mb-2 leading-relaxed dark:text-neutral-400">
                        Your site&apos;s unique plant icon, used as favicon and in the footer.
                        <span className="text-neutral-400 dark:text-neutral-500">
                          {" "}
                          Rebuild your site to update the favicon.
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          setIconGrowCycle((k) => k + 1);
                          setIconLoading(true);
                          const res = await fetch(`/api/sites/${id}/icon`, { method: "POST" });
                          if (res.ok) {
                            const svg = await res.text();
                            setIconSvg(svg);
                            setIconVersion((v) => v + 1);
                            setIconSproutPulse(true);
                            window.setTimeout(() => setIconSproutPulse(false), 1700);
                            track("icon-regenerated", { subdomain: site.subdomain });
                          }
                          setIconLoading(false);
                        }}
                        disabled={iconLoading}
                        className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium border border-neutral-200 rounded hover:bg-neutral-50 transition-colors disabled:opacity-50 dark:hover:bg-neutral-800/80 dark:border-neutral-700"
                      >
                        {iconLoading ? "Growing..." : "Grow new plant"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Picker */}
              <div>
                <h3 className="text-xs font-medium text-neutral-500 mb-3 dark:text-neutral-400">Template</h3>
                <p className="mb-2 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
                  Search, open the list, and point at a template to preview it on the right — click to select.
                </p>
                <TemplatePickerField
                  templates={templates}
                  filteredTemplates={filteredTemplates}
                  selectedTemplate={selectedTemplate}
                  onSelect={setSelectedTemplate}
                  configSearch={configSearch}
                  onConfigSearchChange={setConfigSearch}
                  onPreviewHover={setTemplatePreviewHover}
                />
                {selectedTemplate !== site.template && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleTemplateChange}
                      disabled={savingTemplate}
                      className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {savingTemplate ? "Saving..." : templateSaved ? "Saved" : "Change template"}
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(site.template)}
                      className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/80 dark:border-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Custom Domain */}
              <div>
                <h3 className="text-xs font-medium text-neutral-500 mb-3 dark:text-neutral-400">
                  Custom Domain{" "}
                  <span className="font-normal text-neutral-400 dark:text-neutral-500">[beta]</span>
                </h3>
                {!canCustomize ? (
                  <div className="p-4 rounded">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Custom domains are available on Pro and Studio plans.
                    </p>
                    <Link
                      href="/account"
                      className="text-xs text-neutral-400 underline underline-offset-2 mt-2 inline-block dark:text-neutral-500"
                    >
                      Upgrade
                    </Link>
                  </div>
                ) : !domainStatus?.domain ? (
                  <div className="p-4 rounded">
                    <p className="text-xs text-neutral-400 mb-3 dark:text-neutral-500">
                      Point your own domain to this site.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                        placeholder="blog.example.com"
                        className="flex-1 text-sm px-3 py-1.5 border border-neutral-200 rounded outline-none focus:border-neutral-400 transition-colors dark:focus:border-neutral-500 dark:border-neutral-700"
                      />
                      <button
                        onClick={handleAddDomain}
                        disabled={domainLoading || !domainInput.trim()}
                        className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors disabled:opacity-50"
                      >
                        {domainLoading ? "Adding..." : "Add"}
                      </button>
                    </div>
                    {domainError && (
                      <p className="text-xs text-red-500 mt-2">{domainError}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{domainStatus.domain}</span>
                        {domainStatus.verified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                            Pending
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleRemoveDomain}
                        disabled={domainLoading}
                        className="text-xs text-red-500 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    {!domainStatus.verified && (
                      <div className="space-y-2">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Add this DNS record with your provider:
                        </p>
                        <div className="bg-neutral-50 rounded p-3 text-xs font-mono space-y-2 dark:bg-neutral-900">
                          {domainStatus.domain && !domainStatus.domain.split(".").slice(0, -2).length ? (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                <span className="text-neutral-400 dark:text-neutral-500">Type</span>
                                <span className="text-neutral-400 dark:text-neutral-500">Name</span>
                                <span className="text-neutral-400 dark:text-neutral-500">Value</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <span>A</span>
                                <span>@</span>
                                <span>76.76.21.21</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                <span className="text-neutral-400 dark:text-neutral-500">Type</span>
                                <span className="text-neutral-400 dark:text-neutral-500">Name</span>
                                <span className="text-neutral-400 dark:text-neutral-500">Value</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <span>CNAME</span>
                                <span>{domainStatus.domain?.split(".")[0] || "@"}</span>
                                <span>cname.vercel-dns.com</span>
                              </div>
                            </>
                          )}
                          {domainStatus.verification && domainStatus.verification.length > 0 && (
                            <>
                              <div className="border-t border-neutral-200 my-2 dark:border-neutral-700" />
                              {domainStatus.verification.map((v, i) => (
                                <div key={i} className="grid grid-cols-3 gap-2">
                                  <span>{v.type}</span>
                                  <span>{v.domain}</span>
                                  <span className="break-all">{v.value}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCheckDomain}
                            disabled={domainLoading}
                            className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-50 transition-colors disabled:opacity-50 dark:hover:bg-neutral-800/80 dark:border-neutral-700"
                          >
                            {domainLoading ? "Checking..." : "Check status"}
                          </button>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">
                            DNS can take a few minutes.
                          </p>
                        </div>
                      </div>
                    )}

                    {domainStatus.verified && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        Live at{" "}
                        <a
                          href={`https://${domainStatus.domain}`}
                          target="_blank"
                          rel="noopener"
                          className="underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300"
                        >
                          https://{domainStatus.domain}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <SiteChannelSettingsCard
                siteId={id}
                channelSlug={site.channelSlug}
                channelTitle={site.channelTitle}
                otherSitesChannelSlugs={otherSitesChannelSlugs}
                onChannelUpdated={async ({ channelSlug, channelTitle }) => {
                  setSite((prev) =>
                    prev ? { ...prev, channelSlug, channelTitle } : prev
                  );
                  setUserSites((prev) =>
                    prev.map((s) =>
                      s.id === site.id ? { ...s, channelSlug, channelTitle } : s
                    )
                  );
                  setPreviewRev((n) => n + 1);
                  if (typeof id !== "string") return;
                  const cssRes = await fetch(`/api/sites/${id}/css`);
                  if (!cssRes.ok) return;
                  const cssPayload = await cssRes.json();
                  if (
                    cssPayload &&
                    typeof cssPayload === "object" &&
                    "css" in cssPayload &&
                    typeof (cssPayload as { css: unknown }).css === "string"
                  ) {
                    const loaded = (cssPayload as { css: string }).css;
                    const chRaw =
                      "channelCss" in cssPayload &&
                      typeof (cssPayload as { channelCss: unknown }).channelCss ===
                        "string"
                        ? (cssPayload as { channelCss: string }).channelCss
                        : "";
                    if (loaded.trim()) {
                      setCustomCss(loaded);
                    } else if (chRaw.trim()) {
                      setCustomCss(chRaw);
                    } else {
                      setCustomCss("");
                    }
                  }
                }}
              />
                </div>
              </div>
              )}

              {activeTab === "theme" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/95">
                  <SegmentedControl<ThemeFileTab>
                    segments={[
                      {
                        value: "theme-css",
                        label: <span className="font-mono text-[11px] tracking-tight">theme.css</span>,
                      },
                      {
                        value: "styles-css",
                        label: <span className="font-mono text-[11px] tracking-tight">styles.css</span>,
                      },
                    ]}
                    value={themeFileTab}
                    onChange={setThemeFileTab}
                    ariaLabel="Theme editor files"
                    className="w-full min-w-[14rem] max-w-[17rem] shrink-0"
                    labelClassName="px-2 text-[11px] font-medium"
                  />
                  {themeFileTab === "styles-css" ? (
                    <button
                      type="button"
                      onClick={handleSaveCss}
                      disabled={cssSaving}
                      className="ml-auto shrink-0 rounded-md px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {cssSaving ? "Saving…" : cssSaved ? "Saved" : "Save styles.css"}
                    </button>
                  ) : canCustomize ? (
                    <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-md px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving…" : saved ? "Saved" : "Save theme.css"}
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700/80"
                      >
                        Reset
                      </button>
                    </div>
                  ) : null}
                </div>

                {themeFileTab === "theme-css" && (
                  <div
                    id="panel-theme-css"
                    role="tabpanel"
                    aria-label="theme.css"
                    className="flex min-h-0 flex-1 flex-col bg-[#fafafa] outline-none dark:bg-[#1e1e1e]"
                  >
                    {!canCustomize ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Custom themes are available on Pro and Studio plans.
                        </p>
                        <Link
                          href="/account"
                          className="text-xs text-neutral-400 underline underline-offset-2 dark:text-neutral-500"
                        >
                          Upgrade
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div className="min-h-0 flex-1 overflow-hidden">
                          <ThemeTokensPillEditor
                            value={themeCssDraft}
                            onChange={(v) => {
                              setThemeCssDraft(v);
                              setThemeCssError("");
                            }}
                            ariaLabel="theme.css source"
                          />
                        </div>
                        {themeCssError ? (
                          <footer className="shrink-0 border-t border-neutral-200 bg-neutral-200/60 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950/90">
                            <p className="font-mono text-[11px] leading-snug text-red-600 dark:text-red-400">
                              {themeCssError}
                            </p>
                          </footer>
                        ) : null}
                      </>
                    )}
                  </div>
                )}

                {themeFileTab === "styles-css" && (
                  <div
                    id="panel-styles-css"
                    role="tabpanel"
                    aria-label="styles.css"
                    className="flex min-h-0 flex-1 flex-col bg-[#fafafa] outline-none dark:bg-[#1e1e1e]"
                  >
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <IdeTextEditor
                        value={stylesCssEditorValue}
                        onChange={setCustomCss}
                        ariaLabel="styles.css source"
                      />
                    </div>
                    <footer className="shrink-0 border-t border-neutral-200 bg-neutral-200/60 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950/90">
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-500">
                        Rebuild the site to refresh the live preview. Saved CSS here wins over the channel block when
                        both exist. With no saved or channel styles, the editor shows your current theme tokens so you
                        can override or extend them.
                      </p>
                    </footer>
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="hidden min-h-0 w-full min-w-0 flex-1 flex-col gap-2 md:flex md:min-h-0">
              <h2 className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Preview
              </h2>
              <SitePreviewColumn
                site={site}
                iconSvg={iconSvg}
                iconLoading={iconLoading}
                previewUrl={previewUrl}
                onPreviewRefresh={() => setPreviewRev((n) => n + 1)}
                showPollinator={showPollinator}
                iconGrowCycle={iconGrowCycle}
                iconVersion={iconVersion}
                iconSproutPulse={iconSproutPulse}
                columnClassName="flex w-full min-w-0 min-h-0 flex-1 flex-col gap-3"
                dashboardPreview={previewUsesMockChannel}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
