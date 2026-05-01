import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";

import { BUILTIN_FONTS, GOOGLE_FONTS } from "./fonts";
import {
  DEFAULT_THEME_COLORS,
  DEFAULT_THEME_FONTS,
  type ThemeColors,
  type ThemeFonts,
  expandThemeHex,
  normalizeFontToken,
} from "./theme-css-tokens";

const MAX_CUSTOM_CSS_CHARS = 48_000;

export type AiSiteThemeResult = {
  colors: ThemeColors;
  fonts: ThemeFonts;
  customCss: string | null;
  notes: string | null;
};

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  return text.slice(start, end + 1);
}

function coerceColors(raw: unknown): ThemeColors {
  const d = DEFAULT_THEME_COLORS;
  if (!raw || typeof raw !== "object") return { ...d };
  const o = raw as Record<string, unknown>;
  const pick = (k: keyof ThemeColors) => {
    const v = o[k];
    if (typeof v !== "string") return d[k];
    return expandThemeHex(v) ?? d[k];
  };
  return {
    background: pick("background"),
    text: pick("text"),
    accent: pick("accent"),
    border: pick("border"),
  };
}

function coerceFonts(raw: unknown): ThemeFonts {
  const d = DEFAULT_THEME_FONTS;
  if (!raw || typeof raw !== "object") return { ...d };
  const o = raw as Record<string, unknown>;
  const pick = (k: keyof ThemeFonts) => {
    const v = o[k];
    if (typeof v !== "string") return d[k];
    return normalizeFontToken(v) ?? d[k];
  };
  return {
    heading: pick("heading"),
    body: pick("body"),
  };
}

function sanitizeCustomCss(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.length > MAX_CUSTOM_CSS_CHARS) {
    return t.slice(0, MAX_CUSTOM_CSS_CHARS);
  }
  if (/@import\b/i.test(t)) {
    return null;
  }
  return t;
}

export function parseAiThemeJson(text: string): AiSiteThemeResult {
  const json = extractJsonObject(text);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  return {
    colors: coerceColors(parsed.colors),
    fonts: coerceFonts(parsed.fonts),
    customCss: sanitizeCustomCss(parsed.customCss),
    notes: typeof parsed.notes === "string" ? parsed.notes.trim() || null : null,
  };
}

async function loadTemplateContext(templateSlug: string): Promise<string> {
  const root = path.join(process.cwd(), "templates", templateSlug);
  try {
    const metaRaw = await readFile(path.join(root, "meta.json"), "utf8");
    const meta = JSON.parse(metaRaw) as { name?: string; description?: string };
    const name = meta.name ?? templateSlug;
    const desc = meta.description ?? "";
    return `Template "${name}" (${templateSlug}): ${desc}`;
  } catch {
    return `Template slug: ${templateSlug} (meta not read)`;
  }
}

function fontInstructions(): string {
  const builtins = Object.keys(BUILTIN_FONTS).join(", ");
  const sampleGoogle = GOOGLE_FONTS.slice(0, 12).join(", ");
  return `Font tokens (heading and body) MUST be one of:
- Built-in: ${builtins}
- Google Font: prefix with gf: and use an exact name from the curated list, e.g. gf:Inter, gf:Merriweather. Examples: ${sampleGoogle}, … (match spelling from common web fonts; prefer fonts from this list when possible).`;
}

export function buildAiSiteThemeSystemPrompt(templateBlurb: string): string {
  return `You are helping design a visual theme for a static site generated from Are.na channel content.

The app injects theme colors and fonts as CSS variables on build. Templates consume:
- --color-bg, --color-text, --color-accent, --color-border (hex colors)
- --tg-font-heading, --tg-font-body (resolved stacks; you choose semantic font tokens only)

${fontInstructions()}

Theme colors object keys: background, text, accent, border — each a 6-digit hex like #1a2b3c.

Optional customCss: plain CSS snippets that OVERRIDE layout or template-specific variables using ONLY:
- var(--color-bg), var(--color-text), var(--color-accent), var(--color-border)
- Template-specific variables documented in the template's style.css (prefer conservative overrides; comments welcome)
Do NOT repeat the full theme :root block. Do NOT use @import.

Output a single JSON object ONLY, no markdown fences, with this exact shape:
{
  "colors": { "background": "#...", "text": "#...", "accent": "#...", "border": "#..." },
  "fonts": { "heading": "system or gf:...", "body": "system or gf:..." },
  "customCss": string or null,
  "notes": string (one short sentence for the designer about the direction)
}

Base template context:
${templateBlurb}`;
}

/** Validate theme JSON from the client (same rules as AI output) for admin-only site create. */
export function themeToDbFields(input: unknown):
  | { themeColors: string; themeFonts: string; customCss?: string }
  | null {
  if (input == null || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const colors = coerceColors(o.colors);
  const fonts = coerceFonts(o.fonts);
  const customCss = sanitizeCustomCss(o.customCss);
  const out: { themeColors: string; themeFonts: string; customCss?: string } = {
    themeColors: JSON.stringify(colors),
    themeFonts: JSON.stringify(fonts),
  };
  if (customCss) out.customCss = customCss;
  return out;
}

export async function generateAiSiteTheme(input: {
  userPrompt: string;
  templateSlug: string;
}): Promise<AiSiteThemeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";

  const templateBlurb = await loadTemplateContext(input.templateSlug);
  const system = buildAiSiteThemeSystemPrompt(templateBlurb);

  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    system,
    messages: [
      {
        role: "user",
        content: `The site owner described their goals in free text. Propose a cohesive theme.\n\n---\n${input.userPrompt.trim()}\n---`,
      },
    ],
  });

  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Empty model response");
  }

  return parseAiThemeJson(block.text);
}
