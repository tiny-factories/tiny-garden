"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/track";
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

  // Build preview URL with theme params
  const previewUrl = useMemo(() => {
    const template = selectedTemplate || site?.template;
    if (!template) return null;
    const params = new URLSearchParams({ template });
    if (canCustomize) {
      params.set("bg", colors.background);
      params.set("text", colors.text);
      params.set("accent", colors.accent);
      params.set("border", colors.border);
      params.set("headingFont", fonts.heading);
      params.set("bodyFont", fonts.body);
    }
    return `/api/templates/preview?${params.toString()}`;
  }, [selectedTemplate, site?.template, colors, fonts, canCustomize]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sites`).then((r) => r.json()),
      fetch(`/api/sites/${id}/theme`).then((r) => r.json()),
      fetch("/api/account").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
      fetch(`/api/sites/${id}/domain`).then((r) => r.json()),
    ])
      .then(([sites, theme, acc, tmpls, domain]) => {
        const s = (sites as Site[]).find((s: Site) => s.id === id);
        if (s) {
          setSite(s);
          setSelectedTemplate(s.template);
        }
        if (theme.colors) setColors(theme.colors);
        if (theme.fonts) setFonts(theme.fonts);
        setAccount(acc);
        setTemplates(tmpls as Template[]);
        if (domain && !domain.error) setDomainStatus(domain);
      })
      .finally(() => setLoading(false));
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
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-neutral-100 rounded" />
          <div className="h-48 bg-neutral-50 rounded" />
        </div>
      </main>
    );
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

      {/* Side-by-side layout */}
      <div className="flex gap-6 items-start">
        {/* Left panel — Controls */}
        <div className="w-80 shrink-0">
          {/* Tab navigation */}
          <div className="flex border-b border-neutral-200 mb-4">
            <button
              onClick={() => setActiveTab("theme")}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === "theme"
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              Theme
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === "config"
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              Config
            </button>
          </div>

          {/* Theme tab */}
          {activeTab === "theme" && (
            <div className="space-y-4">
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
                <div className="grid grid-cols-2 gap-2">
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
                      <p className="font-medium text-xs">{t.name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{t.description}</p>
                    </button>
                  ))}
                </div>
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
                <h3 className="text-xs font-medium text-neutral-500 mb-3">Custom Domain</h3>
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

        {/* Right panel — Live Preview */}
        <div className="flex-1 min-w-0">
          <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white sticky top-8">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-100 bg-neutral-50">
              <div className="w-2 h-2 rounded-full bg-neutral-300" />
              <div className="w-2 h-2 rounded-full bg-neutral-300" />
              <div className="w-2 h-2 rounded-full bg-neutral-300" />
              <span className="text-[10px] text-neutral-400 ml-2 truncate">
                {site.subdomain}.tiny.garden
              </span>
            </div>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full border-0"
                style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}
                title="Site preview"
              />
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
