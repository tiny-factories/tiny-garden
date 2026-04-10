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

## Theme injection (production build)

In `src/lib/build.ts`, when a site has saved theme colors/fonts:

| Source | Injected CSS (conceptually) |
|--------|-----------------------------|
| `themeColors` | `:root` with `--color-bg`, `--color-text`, `--color-accent`, `--color-border`; `body { background, color }`; `a { color }` |
| `themeFonts` | `:root` with `--tg-font-heading`, `--tg-font-body` (resolved `font-family` stacks); `h1–h6` and `body` font-family rules; Google Fonts `<link>`s when needed |

Templates should **consume** these variables where possible so the **Theme** tab matches the built site. Use fallbacks for the no-theme case, e.g. `var(--color-bg, #fff)`.

**Preview** (`src/app/api/templates/preview/route.ts`) should expose the same token names where theme query params are applied (e.g. `--color-bg` alongside `--color-background` for older preview CSS).

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
