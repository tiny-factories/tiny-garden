"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/track";

interface Site {
  id: string;
  subdomain: string;
  channelSlug: string;
  channelTitle: string;
  template: string;
  published: boolean;
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

const FONT_OPTIONS = [
  { value: "system", label: "System (default)" },
  { value: "inter", label: "Inter" },
  { value: "georgia", label: "Georgia" },
  { value: "menlo", label: "Menlo (monospace)" },
  { value: "palatino", label: "Palatino" },
  { value: "helvetica", label: "Helvetica" },
];

const DEFAULT_FONTS: ThemeFonts = {
  heading: "system",
  body: "system",
};

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

  const canCustomize = account?.isAdmin || account?.isFriend || account?.plan === "pro" || account?.plan === "studio";

  useEffect(() => {
    Promise.all([
      fetch(`/api/sites`).then((r) => r.json()),
      fetch(`/api/sites/${id}/theme`).then((r) => r.json()),
      fetch("/api/account").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ])
      .then(([sites, theme, acc, tmpls]) => {
        const s = (sites as Site[]).find((s: Site) => s.id === id);
        if (s) {
          setSite(s);
          setSelectedTemplate(s.template);
        }
        if (theme.colors) setColors(theme.colors);
        if (theme.fonts) setFonts(theme.fonts);
        setAccount(acc);
        setTemplates(tmpls as Template[]);
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

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-neutral-100 rounded" />
          <div className="h-48 bg-neutral-50 rounded" />
        </div>
      </main>
    );
  }

  if (!site) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-neutral-400">Site not found.</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/sites" className="text-xs text-neutral-400 hover:text-neutral-600">
            &larr; Back to sites
          </Link>
          <h1 className="text-lg font-medium mt-1">{site.channelTitle}</h1>
          <p className="text-xs text-neutral-400">{site.subdomain}.tiny.garden &middot; {site.template}</p>
        </div>
      </div>

      {/* Template Picker */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-4">Template</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
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
        {selectedTemplate !== site.template && (
          <div className="flex items-center gap-2">
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
            <p className="text-xs text-neutral-400 ml-2">
              Rebuild your site to apply the new template.
            </p>
          </div>
        )}
      </section>

      {/* Theme Editor */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-4">Theme</h2>

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
            <div className="p-4 border border-neutral-100 rounded mb-4">
              <h3 className="text-xs font-medium text-neutral-500 mb-3">Colors</h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(DEFAULT_COLORS) as (keyof ThemeColors)[]).map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                      className="w-6 h-6 rounded border border-neutral-200 cursor-pointer"
                    />
                    <span className="text-xs text-neutral-500 capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fonts */}
            <div className="p-4 border border-neutral-100 rounded mb-4">
              <h3 className="text-xs font-medium text-neutral-500 mb-3">Fonts</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-neutral-500">Headings</span>
                  <select
                    value={fonts.heading}
                    onChange={(e) => setFonts({ ...fonts, heading: e.target.value })}
                    className="mt-1 block w-full text-sm border border-neutral-200 rounded px-2 py-1.5"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-neutral-500">Body</span>
                  <select
                    value={fonts.body}
                    onChange={(e) => setFonts({ ...fonts, body: e.target.value })}
                    className="mt-1 block w-full text-sm border border-neutral-200 rounded px-2 py-1.5"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div
              className="p-4 border border-neutral-100 rounded mb-4"
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              }}
            >
              <h3 className="text-xs font-medium text-neutral-500 mb-2">Preview</h3>
              <p style={{ fontFamily: fontFamily(fonts.heading) }} className="text-lg font-medium">
                {site.channelTitle}
              </p>
              <p style={{ fontFamily: fontFamily(fonts.body), color: colors.accent }} className="text-sm mt-1">
                This is a preview of your theme colors and fonts.
              </p>
              <div style={{ borderColor: colors.border }} className="border-t mt-3 pt-3">
                <p style={{ fontFamily: fontFamily(fonts.body) }} className="text-xs">
                  Body text with your selected font and colors.
                </p>
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
                Reset to default
              </button>
              <p className="text-xs text-neutral-400 ml-2">
                Rebuild your site to apply changes.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function fontFamily(font: string): string {
  const map: Record<string, string> = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    inter: '"Inter", sans-serif',
    georgia: '"Georgia", serif',
    menlo: '"Menlo", "Consolas", monospace',
    palatino: '"Palatino Linotype", "Palatino", serif',
    helvetica: '"Helvetica Neue", "Helvetica", sans-serif',
  };
  return map[font] || map.system;
}
