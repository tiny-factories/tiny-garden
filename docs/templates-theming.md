# Templates & theming

Reference for adding or changing Handlebars templates so dashboard **Theme**, **styles.css**, channel blocks, and production builds stay aligned.

## Layout

- Templates live under `templates/{slug}/` (`index.hbs`, `style.css`, optional `block.hbs`, `meta.json`).
- Discovery is filesystem-based (`src/lib/templates-manifest.ts`); no manual registry beyond the folder.
- The data contract is `SiteData` and `TemplateBlock` in `src/lib/build.ts`.

## Custom CSS precedence

1. **Site `customCss` (DB)** — edited in site settings → Theme → **styles.css** tab; saved via `PUT /api/sites/[id]/css`.
2. **Channel `styles.css` block** — Are.na Text block whose title is exactly `styles.css` (see `CHANNEL_STYLES_BLOCK_TITLE` in `src/lib/channel-styles.ts`). Content is plain CSS, not SCSS.
3. Merge rule: `resolveSiteCustomCss()` — **saved site CSS wins** when non-empty; otherwise channel block CSS is used.

Theme color/font JSON (`themeColors` / `themeFonts`) is separate: injected at **build** time as CSS (see below), not the same field as `customCss`.

## CSS trust boundary

CSS can come from template files, the dashboard, preview query params, or a reserved Are.na block. Treat all of it as untrusted before it is placed inside an HTML `<style>` tag:

- `escapeStyleTagContent()` in `src/lib/theme-css-tokens.ts` escapes any `</style` sequence to `<\/style`, preserving CSS text while preventing a style-block breakout.
- Production builds call it for template `style.css`, generated theme override CSS, and the effective site CSS in `src/lib/build.ts`.
- Template previews call it for template `style.css`, saved/channel CSS, and unsaved `customCss` preview snippets in `src/app/api/templates/preview/route.ts`.
- Do **not** reintroduce ad hoc stripping or raw interpolation for style blocks. Reuse `escapeStyleTagContent()` anywhere CSS is embedded into HTML.

Example edge case:

```css
/* Safe to store/preview: the closing style tag is escaped before injection. */
body::before { content: "</style><script>alert(1)</script>"; }
```

## Theme injection (production build)

In `src/lib/build.ts`, when a site has saved theme colors/fonts:

| Source | Injected CSS (conceptually) |
|--------|-----------------------------|
| `themeColors` | `:root` with `--color-bg`, `--color-text`, `--color-accent`, `--color-border`; `body { background, color }`; `a { color }` |
| `themeFonts` | `:root` with `--tg-font-heading`, `--tg-font-body` (resolved `font-family` stacks); `h1–h6` and `body` font-family rules; Google Fonts `<link>`s when needed |

Templates should **consume** these variables where possible so the **Theme** tab matches the built site. Use fallbacks for the no-theme case, e.g. `var(--color-bg, #fff)`.

**Preview** (`src/app/api/templates/preview/route.ts`) should expose the same token names where theme query params are applied (e.g. `--color-bg` alongside `--color-background` for older preview CSS).

### Theme API validation

`PUT /api/sites/[id]/theme` only accepts normalized theme fields:

- `colors.background`, `colors.text`, `colors.accent`, and `colors.border` must be valid 3- or 6-digit hex strings. Values are stored expanded/lowercased as 6-digit hex.
- `fonts.heading` and `fonts.body` must be `system`, a built-in key from `BUILTIN_FONTS`, or an exact curated Google Font token from `GOOGLE_FONTS` (with or without the `gf:` prefix). Unknown Google font names are rejected.
- Sending invalid colors or fonts returns `400 { error: "Invalid theme payload" }`; omitted `colors` or `fonts` clears that part of the saved theme.

Preview query params use the same validators (`expandThemeHex`, `normalizeFontToken`) and ignore invalid values instead of interpolating them into CSS.

## Injection order

The built page is finalized in `applyStaticPageFinishes()`:

1. Template `style.css` replaces `<link rel="stylesheet" href="style.css">`.
2. Favicon and tiny.garden footer are added.
3. Theme font links and theme override CSS are inserted into `<head>`.
4. Effective site CSS (`customCss` from DB, or channel `styles.css`) is inserted last as `<style id="tiny-garden-site-css">`.

Because effective site CSS is last, user/layout overrides can intentionally win over template defaults and theme overrides. Keep templates variable-driven so this order is predictable.

## Operational checks

- If a built site shows a `styles.css` Are.na block as content, confirm the block title normalizes to exactly `styles.css`; reserved-title checks ignore case, non-breaking spaces, zero-width characters, and Unicode compatibility forms.
- If dashboard preview differs from production, compare token names and injection order in `src/app/api/templates/preview/route.ts` with `applyStaticPageFinishes()` in `src/lib/build.ts`.
- If a theme save returns `400`, validate hex values and font tokens against `src/lib/theme-css-tokens.ts` and `src/lib/fonts.ts`.
- After changing injection behavior, test both a production build path and `/api/templates/preview` with CSS containing a literal `</style` sequence.

## Site settings — default text in the styles.css editor

**theme.css** (Theme tab pill editor) holds global **colors and font tokens** (`formatThemeCss` / `parseThemeCss`).

**styles.css** is **not** a duplicate of that file. When the user has not saved custom site CSS, the editor shows **`formatStylesCssPlaceholder(templateSlug)`** in `src/lib/theme-css-tokens.ts`: template-specific layout/block tokens and examples that **reference** `var(--color-*)` from the build, not a second copy of hex theme values.

- Default templates: short comment + generic override example.
- **Photography**: `--photo-*` variables (grid, image filters, stamp/link colors, etc.) wired in `templates/photography/style.css`.

To add defaults for another template, extend `formatStylesCssPlaceholder` and (if needed) add `--your-template-*` variables to that template’s `style.css`.

## Handlebars helpers

Global helpers are registered in `src/lib/build.ts`. Template-specific helpers (e.g. photography grid classes) live there too; keep `/api/templates/preview` in mind — it registers a subset of helpers today; importing `build` loads the full set when the preview route runs.

## Checklist for a new template

1. Add `templates/{slug}/` with `meta.json`, `index.hbs`, `style.css`, optional `block.hbs`.
2. Use `SiteData` fields only; test with `GET /api/templates/preview?template={slug}`.
3. If the Theme tab should drive colors/fonts: read **`--color-*`** and **`--tg-font-*`** in `style.css` (with hex fallbacks), or document that the template ignores them.
4. If users need a good **styles.css** starting point: add a `format*StylesDraftCss` helper and a branch in `stylesCssEditorValue`.
5. Update in-app docs at `/docs` if the template has special block behavior (per existing gallery/directory notes).
6. Optional: register an example channel in admin template examples if you use curated previews.

## Related files

| Concern | File |
|---------|------|
| Build, theme injection, Handlebars | `src/lib/build.ts` |
| Theme token strings / draft CSS | `src/lib/theme-css-tokens.ts` |
| Channel styles block title & extraction | `src/lib/channel-styles.ts` |
| Styles editor + template branch | `src/app/sites/[id]/page.tsx` |
| Template preview HTML | `src/app/api/templates/preview/route.ts` |
