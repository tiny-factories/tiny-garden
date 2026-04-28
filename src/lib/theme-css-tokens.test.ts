import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Handlebars from "handlebars";

import {
  DEFAULT_THEME_FONTS,
  escapeStyleTagContent,
  formatThemeCss,
  normalizeThemeColorsInput,
  normalizeThemeFontsInput,
  parseThemeCss,
} from "./theme-css-tokens";

describe("escapeStyleTagContent", () => {
  it("escapes every closing style tag sequence without removing CSS content", () => {
    const css =
      'body::before { content: "</style><script>alert(1)</script>"; }\n' +
      "main::after { content: '</STYLE data-x=\"1\">'; }";

    const escaped = escapeStyleTagContent(css);

    assert.equal(
      escaped,
      'body::before { content: "<\\/style><script>alert(1)</script>"; }\n' +
        "main::after { content: '<\\/style data-x=\"1\">'; }"
    );
    assert.equal(/<\/style/i.test(escaped), false);
    assert.match(escaped, /<script>alert\(1\)<\/script>/);
  });

  it("keeps custom CSS safe when rendered through templates' raw style slots", () => {
    const template = Handlebars.compile("<style>{{{site.custom_css}}}</style>");
    const payload = 'body::before { content: "</style><script>alert(1)</script>"; }';

    const html = template({
      site: { custom_css: escapeStyleTagContent(payload) },
    });

    assert.equal(
      html,
      '<style>body::before { content: "<\\/style><script>alert(1)</script>"; }</style>'
    );
    assert.equal(html.match(/<\/style/gi)?.length, 1);
  });
});

describe("theme CSS normalization", () => {
  it("accepts and normalizes expected theme colors and font tokens", () => {
    assert.deepEqual(
      normalizeThemeColorsInput({
        background: "fff",
        text: "#ABCDEF",
        accent: "123456",
        border: "#000",
      }),
      {
        background: "#ffffff",
        text: "#abcdef",
        accent: "#123456",
        border: "#000000",
      }
    );

    assert.deepEqual(
      normalizeThemeFontsInput({
        heading: "GF:Roboto",
        body: " georgia ",
      }),
      {
        heading: "gf:Roboto",
        body: "georgia",
      }
    );
  });

  it("rejects CSS and HTML payloads before they can be formatted into style blocks", () => {
    assert.equal(
      normalizeThemeColorsInput({
        background: "#fff;}</style><script>alert(1)</script>",
        text: "#111111",
        accent: "#222222",
        border: "#333333",
      }),
      null
    );
    assert.equal(
      normalizeThemeFontsInput({
        heading: "Inter</style><script>alert(1)</script>",
        body: "system",
      }),
      null
    );

    const css = formatThemeCss(
      { background: "#ffffff", text: "#111111", accent: "#222222", border: "#333333" },
      DEFAULT_THEME_FONTS
    );

    assert.equal(/<\/style/i.test(css), false);
  });
});

describe("parseThemeCss", () => {
  it("parses valid theme.css tokens and rejects values that are not raw tokens", () => {
    assert.deepEqual(
      parseThemeCss(`
:root {
  --color-bg: #fff;
  --color-text: #111111;
  --color-accent: abc;
  --color-border: #eeeeee;
  --font-heading: "gf:Roboto";
  --font-body: 'system';
}
`),
      {
        ok: true,
        colors: {
          background: "#ffffff",
          text: "#111111",
          accent: "#aabbcc",
          border: "#eeeeee",
        },
        fonts: {
          heading: "gf:Roboto",
          body: "system",
        },
      }
    );

    const parsed = parseThemeCss(`
:root {
  --color-bg: #fff;
  --color-text: #111;
  --color-accent: #222;
  --color-border: #333;
  --font-heading: system</style><script>alert(1)</script>;
  --font-body: system;
}
`);
    assert.equal(parsed.ok, false);
    assert.match(parsed.error, /Invalid --font-heading or --font-body/);
  });
});
