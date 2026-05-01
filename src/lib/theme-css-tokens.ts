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

/**
 * Default text for the site settings **styles.css** editor when the user has not
 * saved custom CSS. Intentionally **not** a copy of {@link formatThemeCss}: theme
 * colors/fonts belong in the Theme tab; this field is for template layout, block
 * chrome, and semantic overrides that reference `var(--color-*)` from the build.
 */
export function formatStylesCssPlaceholder(templateSlug: string): string {
  if (templateSlug === "photography") {
    return `/* Site CSS — Photography layout & block chrome. Colors & fonts: Theme tab (injected on build as --color-* and --tg-font-*). */

:root {
  /* Page & grid */
  --photo-page-padding: 40px;
  --photo-grid-gap: 14px;
  --photo-grid-row-height: 220px;
  --photo-grid-max-width: 1360px;
  --photo-tile-radius: 0;
  --photo-header-margin-bottom: 60px;
  --photo-footer-margin-top: 80px;
  --photo-block-prose-padding: 28px 32px;

  /* By block / role (defaults follow theme accent) */
  --photo-logo-color: var(--color-accent);
  --photo-stamp-color: var(--color-accent);
  --photo-prose-title-color: var(--color-accent);
  --photo-link-title-color: var(--color-accent);

  /* Image cells */
  --photo-image-filter: grayscale(0.2) contrast(1.1);
  --photo-image-filter-hover: grayscale(0) contrast(1);

  /* Header/footer/lightbox chrome only — 0 off */
  --photo-label-glow: 0;

  /* On-image labels: mix-blend-mode — difference | exclusion | normal */
  --photo-on-image-blend-mode: difference;

  /* Overlay */
  --photo-grid-lines-opacity: 1;
}

/* Examples — uncomment to tune */
/* :root { --photo-label-glow: 0.85; } */
/* :root { --photo-on-image-blend-mode: exclusion; } */
/* .cell--prose { } */
/* .cell--embed .photo-media iframe { border-radius: 4px; } */
/* .grid-lines { opacity: 0.35; } */
`;
  }

  if (templateSlug === "finder") {
    return `/* Site CSS — Finder shell & layout. Colors & fonts: Theme tab (injected as --color-* and --tg-font-*). */

:root {
  /* Full-viewport shell (default). Set max-width to cap width on large screens. */
  --finder-shell-max-w: none;
  --finder-shell-min-h: 100%;
  --finder-shell-h: 100vh;
  --finder-shadow: none;

  /* Columns preview pane (right) */
  --finder-preview-min-h: 240px;

  /* Icon / folder tiles (defaults follow theme neutrals) */
  --finder-icon-folder: color-mix(in srgb, var(--color-text) 14%, var(--color-bg));
  --finder-icon-folder-tab: color-mix(in srgb, var(--color-text) 12%, var(--color-bg));
}

/* Examples — uncomment to tune */
/* :root { --finder-shell-max-w: 1200px; --finder-shadow: 0 20px 50px rgba(0,0,0,0.08); } */
`;
  }

  if (templateSlug === "feature-requests") {
    return `/* Site CSS — Feature Requests registry layout. Colors & fonts: Theme tab (injected as --color-* and --tg-font-*). */

:root {
  /* Page & type scale */
  --fr-page-pad: 40px;
  --fr-page-pad-sm: 24px;
  --fr-title-size: clamp(2rem, 6vw, 4rem);

  /* Overlay copy on the accent panel (usually #fff on a saturated accent) */
  --fr-overlay-fg: #fff;
}

/* Examples — uncomment to tune */
/* :root { --fr-page-pad: 32px; --fr-title-size: 3.5rem; } */
`;
  }

  if (templateSlug === "custom") {
    return `/* Site CSS — Custom template (often AI-assisted). Theme tab sets --color-* and fonts; tune blog-derived layout here. */

:root {
  /* Example: section rhythm */
  /* --custom-section-gap: 2rem; */
}

/* Example: soften block separation using theme border */
/* article { border-bottom: 1px solid var(--color-border); } */
`;
  }

  return `/* Site CSS — optional template overrides. Set colors & fonts in the Theme tab (theme.css); the build injects --color-bg, --color-text, --color-accent, --color-border and font stacks. */

/* Use theme tokens, e.g.:
:root {
  --block-radius: 8px;
}
article img {
  border-radius: var(--block-radius);
}
*/
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
