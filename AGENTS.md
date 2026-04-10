# Agent notes (Cursor / coding assistants)

Short pointers for this repo. For **template authoring, theming, and styles.css behavior**, read **`docs/templates-theming.md`** first—especially before adding templates or changing dashboard theme/CSS.

## Essentials

- **Stack:** Next.js 15 (App Router), Prisma, Handlebars static sites under `templates/{slug}/`. Product overview: `CLAUDE.md`.
- **New template:** folder + `meta.json`; data shape `SiteData` in `src/lib/build.ts`. Full checklist: `docs/templates-theming.md`.
- **Theme vs custom CSS:** Saved site CSS and channel `styles.css` block precedence, plus `--color-*` / `--tg-font-*` injection: `docs/templates-theming.md`.
- **User “skills”** for Cursor live in the user’s skills directory, not in this repo—use **`docs/templates-theming.md`** here for template conventions instead of a separate `skills.md`.

## When touching templates or theme

1. Confirm build injection in `src/lib/build.ts` matches what `style.css` expects.
2. If the template preview should match production, align `:root` tokens in `src/app/api/templates/preview/route.ts`.
3. If the styles.css editor needs a template-specific default, add a branch to `formatStylesCssPlaceholder()` in `src/lib/theme-css-tokens.ts` (do **not** duplicate `formatThemeCss` — theme.css owns colors/fonts).
