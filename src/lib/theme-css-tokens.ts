import { BUILTIN_FONTS, GOOGLE_FONTS } from "./fonts";

export type ThemeColors = {
  background: string;
  text: string;
  accent: string;
  border: string;
};

export type ThemeFonts = {
  heading: string;
  body: string;
};

export const DEFAULT_THEME_COLORS: ThemeColors = {
  background: "#ffffff",
  text: "#1a1a1a",
  accent: "#555555",
  border: "#e5e5e5",
};

export const DEFAULT_THEME_FONTS: ThemeFonts = {
  heading: "system",
  body: "system",
};

export function expandThemeHex(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (!v.startsWith("#")) v = `#${v}`;
  const m3 = /^#([0-9a-f]{3})$/i.exec(v);
  if (m3) {
    const [a, b, c] = m3[1]!.split("");
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  const m6 = /^#([0-9a-f]{6})$/i.exec(v);
  if (m6) return `#${m6[1]}`.toLowerCase();
  return null;
}

export function captureCssRaw(css: string, prop: string): string | null {
  const re = new RegExp(`${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;\\n]+)`, "i");
  const m = css.match(re);
  if (!m) return null;
  let v = m[1]!.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || null;
}

export function normalizeFontToken(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === "system") return "system";
  const builtinKey = Object.keys(BUILTIN_FONTS).find((k) => k.toLowerCase() === lower);
  if (builtinKey) return builtinKey;
  if (lower.startsWith("gf:")) {
    const name = t.slice(3).trim();
    if (!name) return null;
    const exact = GOOGLE_FONTS.find((g) => g.toLowerCase() === name.toLowerCase());
    return `gf:${exact ?? name}`;
  }
  const exactGoogle = GOOGLE_FONTS.find((g) => g.toLowerCase() === lower);
  if (exactGoogle) return `gf:${exactGoogle}`;
  return null;
}

export function formatThemeCss(c: ThemeColors, f: ThemeFonts): string {
  return `/* Theme tokens — saved as themeColors + themeFonts; injected on build */
:root {
  --color-bg: ${c.background};
  --color-text: ${c.text};
  --color-accent: ${c.accent};
  --color-border: ${c.border};
  --font-heading: ${f.heading};
  --font-body: ${f.body};
}
`;
}

export function parseThemeCss(
  input: string
): { ok: true; colors: ThemeColors; fonts: ThemeFonts } | { ok: false; error: string } {
  const bgRaw = captureCssRaw(input, "--color-bg") ?? captureCssRaw(input, "--color-background");
  const textRaw = captureCssRaw(input, "--color-text");
  const accentRaw = captureCssRaw(input, "--color-accent");
  const borderRaw = captureCssRaw(input, "--color-border");
  const bg = bgRaw ? expandThemeHex(bgRaw) : null;
  const text = textRaw ? expandThemeHex(textRaw) : null;
  const accent = accentRaw ? expandThemeHex(accentRaw) : null;
  const border = borderRaw ? expandThemeHex(borderRaw) : null;
  if (!bg || !text || !accent || !border) {
    return {
      ok: false,
      error:
        "Need hex colors for --color-bg, --color-text, --color-accent, and --color-border (e.g. inside :root { … }).",
    };
  }
  const fhRaw = captureCssRaw(input, "--font-heading");
  const fbRaw = captureCssRaw(input, "--font-body");
  if (!fhRaw || !fbRaw) {
    return {
      ok: false,
      error:
        "Add --font-heading and --font-body (e.g. system, inter, or gf:Font Name).",
    };
  }
  const heading = normalizeFontToken(fhRaw);
  const body = normalizeFontToken(fbRaw);
  if (!heading || !body) {
    return {
      ok: false,
      error:
        "Invalid --font-heading or --font-body. Use system, a built-in key (inter, georgia, …), or gf:Name for Google Fonts.",
    };
  }
  return { ok: true, colors: { background: bg, text, accent, border }, fonts: { heading, body } };
}
