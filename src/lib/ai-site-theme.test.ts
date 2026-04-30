import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_THEME_COLORS,
  DEFAULT_THEME_FONTS,
} from "./theme-css-tokens";
import { parseAiThemeJson, themeToDbFields } from "./ai-site-theme";

describe("parseAiThemeJson", () => {
  it("extracts model JSON, normalizes valid tokens, and defaults unsafe values", () => {
    const result = parseAiThemeJson(`Here is the theme:
{
  "colors": {
    "background": "faf",
    "text": "#123456",
    "accent": "not-a-color",
    "border": "#ABCDEF"
  },
  "fonts": {
    "heading": "Roboto",
    "body": "Unknown Font"
  },
  "customCss": "  .hero { color: var(--color-accent); }  ",
  "notes": "  Soft editorial palette.  "
}
Thanks!`);

    assert.deepEqual(result.colors, {
      background: "#ffaaff",
      text: "#123456",
      accent: DEFAULT_THEME_COLORS.accent,
      border: "#abcdef",
    });
    assert.deepEqual(result.fonts, {
      heading: "gf:Roboto",
      body: DEFAULT_THEME_FONTS.body,
    });
    assert.equal(result.customCss, ".hero { color: var(--color-accent); }");
    assert.equal(result.notes, "Soft editorial palette.");
  });
});

describe("themeToDbFields", () => {
  it("serializes normalized theme fields and omits disallowed custom CSS", () => {
    const importPastTruncationLimit = `${".x{}".repeat(12_001)}\n@import url("https://example.com/x.css");`;

    const fields = themeToDbFields({
      colors: {
        background: "#fff",
        text: "#111",
        accent: "#222222",
        border: "333",
      },
      fonts: {
        heading: "inter",
        body: "gf:Merriweather",
      },
      customCss: importPastTruncationLimit,
    });

    assert.ok(fields);
    assert.deepEqual(JSON.parse(fields.themeColors), {
      background: "#ffffff",
      text: "#111111",
      accent: "#222222",
      border: "#333333",
    });
    assert.deepEqual(JSON.parse(fields.themeFonts), {
      heading: "inter",
      body: "gf:Merriweather",
    });
    assert.equal("customCss" in fields, false);
  });
});
