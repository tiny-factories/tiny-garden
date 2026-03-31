"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/track";
import { Toolbar, SegmentedControl } from "@/components/toolbar";
import { SiteSettingsSkeleton } from "@/components/sites-dashboard-skeletons";
import {
  BUILTIN_FONTS,
  GOOGLE_FONTS,
  isGoogleFont,
  googleFontName,
  fontFamilyCSS,
  googleFontsURL,
} from "@/lib/fonts";

interface Site {
  id: string;
  subdomain: string;
  channelSlug: string;
  channelTitle: string;
  template: string;
  published: boolean;
  customDomain: string | null;
  domainVerified: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
}

interface ThemeColors {
  background: string;
  text: string;
  accent: string;
  border: string;
}

interface ThemeFonts {
  heading: string;
  body: string;
}

interface AccountInfo {
  isAdmin: boolean;
  isFriend: boolean;
  plan: string;
}

const DEFAULT_COLORS: ThemeColors = {
  background: "#ffffff",
  text: "#1a1a1a",
  accent: "#555555",
  border: "#e5e5e5",
};

const DEFAULT_FONTS: ThemeFonts = {
  heading: "system",
  body: "system",
};

type Tab = "theme" | "config";

// ── Font Picker ──────────────────────────────────────────────

function FontPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const displayName = isGoogleFont(value)
    ? googleFontName(value)
    : value === "system"
    ? "System (default)"
    : value.charAt(0).toUpperCase() + value.slice(1);

  const q = search.toLowerCase();

  const builtinOptions = Object.keys(BUILTIN_FONTS).filter(
    (k) => k.toLowerCase().includes(q)
  );

  const googleOptions = GOOGLE_FONTS.filter(
    (f) => f.toLowerCase().includes(q)
  );

  // Allow custom Google Font entry if search doesn't match any known font
  const hasExactMatch =
    builtinOptions.some((k) => k.toLowerCase() === q) ||
    googleOptions.some((f) => f.toLowerCase() === q);

  return (
    <div ref={ref} className="relative">
      <span className="text-xs text-neutral-500">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-1 w-full text-left text-sm border border-neutral-200 rounded px-2 py-1.5 flex items-center justify-between hover:border-neutral-300 transition-colors"
      >
        <span className="truncate">{displayName}</span>
        <svg className="w-3 h-3 text-neutral-400 shrink-0 ml-2" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded shadow-lg max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-neutral-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              className="w-full text-sm px-2 py-1 border border-neutral-200 rounded outline-none focus:border-neutral-400"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {builtinOptions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                  System
                </div>
                {builtinOptions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { onChange(key); setOpen(false); setSearch(""); }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 transition-colors ${
                      value === key ? "bg-neutral-50 font-medium" : ""
                    }`}
                  >
                    {key === "system" ? "System (default)" : key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </>
            )}
            {googleOptions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-medium text-neutral-400 uppercase tracking-wider border-t border-neutral-100 mt-1">
                  Google Fonts
                </div>
                {googleOptions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { onChange(`gf:${name}`); setOpen(false); setSearch(""); }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 transition-colors ${
                      value === `gf:${name}` ? "bg-neutral-50 font-medium" : ""
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </>
            )}
            {search.trim() && !hasExactMatch && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-medium text-neutral-400 uppercase tracking-wider border-t border-neutral-100 mt-1">
                  Custom
                </div>
                <button
                  type="button"
                  onClick={() => { onChange(`gf:${search.trim()}`); setOpen(false); setSearch(""); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 transition-colors"
                >
                  Use &ldquo;{search.trim()}&rdquo; from Google Fonts
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Color Input (picker + hex) ───────────────────────────────

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [hex, setHex] = useState(value);

  // Keep local hex in sync with parent when parent changes (e.g. reset)
  useEffect(() => { setHex(value); }, [value]);

  function commitHex(raw: string) {
    let v = raw.trim();
    if (v && !v.startsWith("#")) v = "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => { onChange(e.target.value); setHex(e.target.value); }}
        className="w-6 h-6 rounded border border-neutral-200 cursor-pointer shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-neutral-500 capitalize">{label}</span>
        <input
          type="text"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={(e) => commitHex(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commitHex(hex); }}
          className="block w-full text-xs font-mono px-1.5 py-0.5 border border-neutral-200 rounded mt-0.5 outline-none focus:border-neutral-400 transition-colors"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

/** Square frame for procedural plant SVG (preview + settings). */
function PlantIconFrame({
  svg,
  sizeClass = "w-16 h-16",
  className,
  decorative,
  growing,
}: {
  svg: string | null;
  sizeClass?: string;
  /** Extra classes (e.g. tighter padding for fake browser chrome). */
  className?: string;
  /** Hide from assistive tech when purely visual (e.g. fake tab favicon). */
  decorative?: boolean;
  /** Sprout-style motion while a new icon is generating. */
  growing?: boolean;
}) {
  const extra = className ? ` ${className}` : "";
  const a11y = decorative ? ({ "aria-hidden": true } as const) : {};
  const growingCls = growing
    ? " origin-bottom animate-[plant-grow-pulse_1.15s_ease-in-out_infinite] border-emerald-300/90 shadow-[0_0_14px_rgba(16,185,129,0.22)]"
    : "";
  if (!svg) {
    return (
      <div
        className={`shrink-0 aspect-square ${sizeClass} border border-neutral-200 rounded bg-neutral-50 animate-pulse${growing ? " border-emerald-200/80" : ""}${extra}`}
        {...a11y}
      />
    );
  }
  return (
    <div
      className={`shrink-0 aspect-square ${sizeClass} border border-neutral-200 rounded bg-white flex items-center justify-center p-1 [&_svg]:block [&_svg]:size-full [&_svg]:max-h-full [&_svg]:max-w-full transition-[border-color,box-shadow] duration-300${growingCls}${extra}`}
      dangerouslySetInnerHTML={{ __html: svg }}
      {...a11y}
    />
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
  const [fonts, setFonts] = useState<ThemeFonts>(DEFAULT_FONTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("theme");
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
  const [configSearch, setConfigSearch] = useState("");

  const canCustomize = account?.isAdmin || account?.isFriend || account?.plan === "pro" || account?.plan === "studio";

  // Load Google Fonts in the settings page so the picker can preview them
  useEffect(() => {
    const url = googleFontsURL([fonts.heading, fonts.body]);
    if (!url) return;
    const id = "theme-google-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [fonts.heading, fonts.body]);

  // Build preview URL with theme params (debounced to avoid iframe flickering)
  const rawPreviewUrl = useMemo(() => {
    const template = selectedTemplate || site?.template;
    if (!template) return null;
    const params = new URLSearchParams({ template });
    if (typeof id === "string") params.set("siteId", id);
    if (canCustomize) {
      params.set("bg", colors.background);
      params.set("text", colors.text);
      params.set("accent", colors.accent);
      params.set("border", colors.border);
      params.set("headingFont", fonts.heading);
      params.set("bodyFont", fonts.body);
    }
    return `/api/templates/preview?${params.toString()}`;
  }, [selectedTemplate, site?.template, colors, fonts, canCustomize, id]);

  const filteredTemplates = useMemo(() => {
    if (!configSearch.trim()) return templates;
    const q = configSearch.toLowerCase();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [templates, configSearch]);

  /** Keep current pick visible in the mobile select when it doesn’t match search. */
  const templateSelectOptions = useMemo(() => {
    if (!selectedTemplate || filteredTemplates.some((t) => t.id === selectedTemplate)) {
      return filteredTemplates;
    }
    const current = templates.find((t) => t.id === selectedTemplate);
    return current ? [current, ...filteredTemplates] : filteredTemplates;
  }, [filteredTemplates, selectedTemplate, templates]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => setPreviewUrl(rawPreviewUrl), 300);
    return () => clearTimeout(timeout);
  }, [rawPreviewUrl]);

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
    ])
      .then(([sites, theme, acc, tmpls, domain, icon]) => {
        if (cancelled) return;

        const list = Array.isArray(sites) ? sites : [];
        const s = list.find((x: Site) => x.id === id);
        if (s) {
          setSite(s);
          setSelectedTemplate(s.template);
        }
        if (theme && typeof theme === "object" && "colors" in theme && theme.colors) {
          setColors(theme.colors as ThemeColors);
        }
        if (theme && typeof theme === "object" && "fonts" in theme && theme.fonts) {
          setFonts(theme.fonts as ThemeFonts);
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
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/sites/${id}/theme`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colors, fonts }),
    });
    if (res.ok) {
      track("theme-saved", { subdomain: site?.subdomain || "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-neutral-400">Site not found.</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/sites" className="text-xs text-neutral-400 hover:text-neutral-600">
            &larr; Back to sites
          </Link>
          <h1 className="text-lg font-medium mt-1">{site.channelTitle}</h1>
          <p className="text-xs text-neutral-400">{site.subdomain}.tiny.garden &middot; {site.template}</p>
        </div>
      </div>

      {/* Mobile: controls first, preview below. md+: side‑by‑side. */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Left panel — Controls */}
        <div className="w-full shrink-0 md:w-80">
          {/* Tab navigation + search */}
          <Toolbar
            search={activeTab === "config" ? configSearch : undefined}
            onSearchChange={activeTab === "config" ? setConfigSearch : undefined}
            searchPlaceholder="Search templates..."
          >
            <SegmentedControl<Tab>
              segments={[
                { value: "theme", label: "Theme" },
                { value: "config", label: "Config" },
              ]}
              value={activeTab}
              onChange={setActiveTab}
              ariaLabel="Settings section"
              className="w-[8.25rem] shrink-0"
              labelClassName="px-3 text-xs font-medium"
            />
          </Toolbar>

          {/* Theme tab */}
          {activeTab === "theme" && (
            <div className="space-y-4">
              {/* Site Icon — available on all plans */}
              <div>
                <h3 className="text-xs font-medium text-neutral-500 mb-3">Site Icon</h3>
                <div className="p-4 border border-neutral-100 rounded">
                  <div className="flex items-center gap-4">
                    <PlantIconFrame svg={iconSvg} growing={iconLoading} />
                    <div>
                      <p className="text-xs text-neutral-500 mb-2">
                        Your site&apos;s unique plant icon, used as favicon and in the footer.
                      </p>
                      <button
                        onClick={async () => {
                          setIconLoading(true);
                          const res = await fetch(`/api/sites/${id}/icon`, { method: "POST" });
                          if (res.ok) {
                            const svg = await res.text();
                            setIconSvg(svg);
                            track("icon-regenerated", { subdomain: site.subdomain });
                          }
                          setIconLoading(false);
                        }}
                        disabled={iconLoading}
                        className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-50 transition-colors disabled:opacity-50"
                      >
                        {iconLoading ? "Growing..." : "Grow new plant"}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 mt-3">
                    Rebuild your site to update the favicon.
                  </p>
                </div>
              </div>

              {!canCustomize ? (
                <div className="p-4 border border-neutral-100 rounded">
                  <p className="text-sm text-neutral-500">
                    Custom themes are available on Pro and Studio plans.
                  </p>
                  <Link
                    href="/account"
                    className="text-xs text-neutral-400 underline underline-offset-2 mt-2 inline-block"
                  >
                    Upgrade
                  </Link>
                </div>
              ) : (
                <>
                  {/* Colors */}
                  <div className="p-4 border border-neutral-100 rounded">
                    <h3 className="text-xs font-medium text-neutral-500 mb-3">Colors</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {(Object.keys(DEFAULT_COLORS) as (keyof ThemeColors)[]).map((key) => (
                        <ColorInput
                          key={key}
                          label={key}
                          value={colors[key]}
                          onChange={(v) => setColors({ ...colors, [key]: v })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="p-4 border border-neutral-100 rounded">
                    <h3 className="text-xs font-medium text-neutral-500 mb-3">Fonts</h3>
                    <div className="space-y-3">
                      <FontPicker
                        label="Headings"
                        value={fonts.heading}
                        onChange={(v) => setFonts({ ...fonts, heading: v })}
                      />
                      <FontPicker
                        label="Body"
                        value={fonts.body}
                        onChange={(v) => setFonts({ ...fonts, body: v })}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : saved ? "Saved" : "Save theme"}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Rebuild your site to apply changes.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Config tab */}
          {activeTab === "config" && (
            <div className="space-y-4">
              {/* Template Picker */}
              <div>
                <h3 className="text-xs font-medium text-neutral-500 mb-3">Template</h3>
                {/* Narrow screens: compact dropdown */}
                <div className="md:hidden space-y-2">
                  {templateSelectOptions.length === 0 ? (
                    <p className="text-xs text-neutral-400">No templates match your search.</p>
                  ) : (
                    <>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full text-sm border border-neutral-200 rounded px-2 py-2 outline-none focus:border-neutral-400 bg-white"
                        aria-label="Choose template"
                      >
                        {templateSelectOptions.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const meta = templates.find((t) => t.id === selectedTemplate);
                        return meta?.description ? (
                          <p className="text-xs text-neutral-400 leading-snug">{meta.description}</p>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
                {/* md+: card grid */}
                {filteredTemplates.length === 0 ? (
                  <p className="hidden md:block text-xs text-neutral-400 py-1">
                    No templates match your search.
                  </p>
                ) : (
                  <div className="hidden md:grid grid-cols-2 gap-2">
                    {filteredTemplates.map((t) => (
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
                        <p className="font-medium text-xs">{t.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{t.description}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedTemplate !== site.template && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleTemplateChange}
                      disabled={savingTemplate}
                      className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                      {savingTemplate ? "Saving..." : templateSaved ? "Saved" : "Change template"}
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(site.template)}
                      className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Custom Domain */}
              <div>
                <h3 className="text-xs font-medium text-neutral-500 mb-3">
                  Custom Domain{" "}
                  <span className="font-normal text-neutral-400">[beta]</span>
                </h3>
                {!canCustomize ? (
                  <div className="p-4 border border-neutral-100 rounded">
                    <p className="text-sm text-neutral-500">
                      Custom domains are available on Pro and Studio plans.
                    </p>
                    <Link
                      href="/account"
                      className="text-xs text-neutral-400 underline underline-offset-2 mt-2 inline-block"
                    >
                      Upgrade
                    </Link>
                  </div>
                ) : !domainStatus?.domain ? (
                  <div className="p-4 border border-neutral-100 rounded">
                    <p className="text-xs text-neutral-400 mb-3">
                      Point your own domain to this site.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                        placeholder="blog.example.com"
                        className="flex-1 text-sm px-3 py-1.5 border border-neutral-200 rounded outline-none focus:border-neutral-400 transition-colors"
                      />
                      <button
                        onClick={handleAddDomain}
                        disabled={domainLoading || !domainInput.trim()}
                        className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
                      >
                        {domainLoading ? "Adding..." : "Add"}
                      </button>
                    </div>
                    {domainError && (
                      <p className="text-xs text-red-500 mt-2">{domainError}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border border-neutral-100 rounded space-y-3">
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
                        <p className="text-xs text-neutral-500">
                          Add this DNS record with your provider:
                        </p>
                        <div className="bg-neutral-50 rounded p-3 text-xs font-mono space-y-2">
                          {domainStatus.domain && !domainStatus.domain.split(".").slice(0, -2).length ? (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                <span className="text-neutral-400">Type</span>
                                <span className="text-neutral-400">Name</span>
                                <span className="text-neutral-400">Value</span>
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
                                <span className="text-neutral-400">Type</span>
                                <span className="text-neutral-400">Name</span>
                                <span className="text-neutral-400">Value</span>
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
                              <div className="border-t border-neutral-200 my-2" />
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
                            className="px-3 py-1.5 text-sm border border-neutral-200 rounded hover:bg-neutral-50 transition-colors disabled:opacity-50"
                          >
                            {domainLoading ? "Checking..." : "Check status"}
                          </button>
                          <p className="text-xs text-neutral-400">
                            DNS can take a few minutes.
                          </p>
                        </div>
                      </div>
                    )}

                    {domainStatus.verified && (
                      <p className="text-xs text-neutral-400">
                        Live at{" "}
                        <a
                          href={`https://${domainStatus.domain}`}
                          target="_blank"
                          rel="noopener"
                          className="underline underline-offset-2 hover:text-neutral-600"
                        >
                          https://{domainStatus.domain}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Channel info */}
              <div className="p-4 border border-neutral-100 rounded">
                <h3 className="text-xs font-medium text-neutral-500 mb-2">Channel</h3>
                <p className="text-sm">{site.channelTitle}</p>
                <a
                  href={`https://www.are.na/channel/${site.channelSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-400 underline underline-offset-2 mt-1 inline-block"
                >
                  View on Are.na
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — Live Preview (stacked under controls on small screens) */}
        <div className="w-full min-w-0 flex-1 space-y-3">
          <div className="border border-neutral-200 rounded-lg p-3 bg-white">
            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
              Share preview
            </p>
            <div className="flex gap-3">
              <PlantIconFrame svg={iconSvg} sizeClass="w-14 h-14" growing={iconLoading} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-neutral-400 truncate">
                  {site.subdomain}.tiny.garden
                </p>
                <p className="text-sm font-medium text-neutral-800 truncate">
                  {site.channelTitle}
                </p>
                <p className="text-xs text-neutral-500 mt-1 leading-snug">
                  Same square icon attached to this site in the preview page&apos;s social metadata.
                </p>
              </div>
            </div>
          </div>
          <div
            className={`border rounded-lg overflow-hidden bg-white transition-[border-color,box-shadow] duration-300 md:sticky md:top-8 ${
              iconLoading
                ? "border-emerald-200/80 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
                : "border-neutral-200"
            }`}
          >
            <div
              className={`flex items-center gap-2 px-3 py-2 border-b transition-colors duration-300 ${
                iconLoading
                  ? "border-emerald-100/90 bg-linear-to-r from-emerald-50/90 via-neutral-50 to-emerald-50/70"
                  : "border-neutral-100 bg-neutral-50"
              }`}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    iconLoading ? "bg-emerald-400/70" : "bg-neutral-300"
                  }`}
                />
                <div
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    iconLoading ? "bg-emerald-400/50" : "bg-neutral-300"
                  }`}
                />
                <div
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    iconLoading ? "bg-emerald-300/60" : "bg-neutral-300"
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <PlantIconFrame
                  svg={iconSvg}
                  sizeClass="w-4 h-4"
                  className="p-0.5! rounded-[3px] border-neutral-200/90"
                  decorative
                  growing={iconLoading}
                />
                <span
                  className={`text-[10px] min-w-0 flex-1 truncate transition-colors duration-300 ${
                    iconLoading ? "text-emerald-800/80" : "text-neutral-400"
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
            </div>
            {previewUrl ? (
              <div className="relative">
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  className={`w-full border-0 transition-[filter,opacity] duration-300 max-md:h-[min(26rem,62vh)] max-md:min-h-68 md:h-[calc(100vh-200px)] md:min-h-[500px] ${
                    iconLoading ? "opacity-55 saturate-75" : "opacity-100"
                  }`}
                  title="Site preview"
                />
                {iconLoading && (
                  <div
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end gap-2 pb-10 px-4 bg-linear-to-t from-emerald-100/55 via-emerald-50/15 to-transparent animate-[plant-preview-mist_1.8s_ease-in-out_infinite]"
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
              <div className="flex items-center justify-center h-96 text-sm text-neutral-400">
                Select a template to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
