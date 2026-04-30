// Built-in system fonts (no external loading needed)
export const BUILTIN_FONTS: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", sans-serif',
  georgia: '"Georgia", serif',
  menlo: '"Menlo", "Consolas", monospace',
  palatino: '"Palatino Linotype", "Palatino", serif',
  helvetica: '"Helvetica Neue", "Helvetica", sans-serif',
};

// Popular Google Fonts — curated for variety across serif, sans-serif, mono, display
export const GOOGLE_FONTS = [
  // Sans-serif
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Raleway",
  "Work Sans",
  "DM Sans",
  "Space Grotesk",
  "IBM Plex Sans",
  "Karla",
  "Manrope",
  "Plus Jakarta Sans",
  "Outfit",
  // Serif
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Libre Baskerville",
  "Source Serif 4",
  "Crimson Text",
  "EB Garamond",
  "Cormorant Garamond",
  "DM Serif Display",
  "Fraunces",
  // Monospace
  "JetBrains Mono",
  "Fira Code",
  "IBM Plex Mono",
  "Source Code Pro",
  "Space Mono",
  // Display
  "Syne",
  "Clash Display",
  "Cabinet Grotesk",
  "Instrument Serif",
  "General Sans",
];

/** Flat list for theme UI: built-ins first (system, then A–Z), then Google as `gf:Name`. */
export type FontPickerOption = { token: string; label: string };

export const FONT_PICKER_OPTIONS: FontPickerOption[] = (() => {
  const builtins: FontPickerOption[] = Object.keys(BUILTIN_FONTS).map((k) => ({
    token: k,
    label: k,
  }));
  builtins.sort((a, b) => {
    if (a.token === "system") return -1;
    if (b.token === "system") return 1;
    return a.token.localeCompare(b.token);
  });
  const google: FontPickerOption[] = GOOGLE_FONTS.map((g) => ({
    token: `gf:${g}`,
    label: `gf:${g}`,
  }));
  return [...builtins, ...google];
})();

/**
 * Returns true if the font value is a Google Font (not a built-in).
 * Font values prefixed with "gf:" are Google Fonts.
 */
export function isGoogleFont(fontValue: string): boolean {
  return fontValue.startsWith("gf:");
}

/** Extract the Google Font family name from a "gf:Font Name" value */
export function googleFontName(fontValue: string): string {
  return fontValue.replace(/^gf:/, "");
}

/** Get the CSS font-family string for any font value */
export function fontFamilyCSS(fontValue: string): string {
  if (isGoogleFont(fontValue)) {
    const name = googleFontName(fontValue);
    return `"${name}", sans-serif`;
  }
  return BUILTIN_FONTS[fontValue] || BUILTIN_FONTS.system;
}

/** Build a Google Fonts CSS URL for one or more font values */
export function googleFontsURL(fontValues: string[]): string | null {
  const families = fontValues
    .filter(isGoogleFont)
    .map(googleFontName)
    .map((name) => `family=${encodeURIComponent(name)}:wght@400;500;600;700`);

  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/** Build a <link> tag for Google Fonts if needed */
export function googleFontsLinkTag(fontValues: string[]): string {
  const url = googleFontsURL(fontValues);
  if (!url) return "";
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${url}">`;
}
