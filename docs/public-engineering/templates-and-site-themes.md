# Templates and site themes

Tiny Garden turns one Are.na channel into static HTML by normalizing channel
blocks, applying a filesystem template, then injecting template CSS, theme
tokens, and optional site CSS.

## Template discovery and validation

Templates live in `templates/{slug}/` and are discovered from disk. A folder is
available to the product when it has a readable `meta.json`.

```text
templates/blog/
  meta.json
  index.hbs
  style.css
  block.hbs        # optional
```

`src/lib/templates-manifest.ts` loads and sorts the templates by display name.
Site create, site update, preview, and build paths call `isKnownTemplateSlug()`
so user input cannot select arbitrary paths.

Primary codepaths:

- `src/lib/templates-manifest.ts`
- `src/app/api/templates/route.ts`
- `src/app/api/sites/route.ts`
- `src/app/api/sites/[id]/route.ts`
- `src/lib/build.ts`

## Template data contract

The build passes a `SiteData` object to Handlebars. Templates should treat this
shape as the public contract.

```ts
interface SiteData {
  channel: {
    title: string;
    slug: string;
    description: string;
    user: { name: string; slug: string; avatar_url: string };
    created_at: string;
    updated_at: string;
    length: number;
  };
  blocks: TemplateBlock[];
  site: {
    subdomain: string;
    url: string;
    template: string;
    custom_css: string;
    built_at: string;
  };
}
```

Blocks are normalized from Are.na into five types:

| Are.na input | Tiny Garden type | Typical fields |
| --- | --- | --- |
| Image / image | `image` | `image.original`, `image.large`, `image.square`, `image.display`, optional dimensions |
| Text / text | `text` | `content` HTML, `title`, `description` |
| Link / link | `link` | `link.url`, `link.title`, `link.description`, `link.thumbnail`, `link.provider` |
| Media / Embed / media / embed | `media` | `embed.url`, `embed.html`, `embed.provider` |
| Attachment / attachment | `attachment` | `attachment.url`, file metadata, display labels, preview flags |

Every block also has `id`, `title`, `description`, `created_at`,
`updated_at`, `position`, `comment_count`, `arena_url`, and `source_url`.

## Shipped template catalog

This list is derived from `templates/*/meta.json`.

| Slug | Name | Best for |
| --- | --- | --- |
| `blank` | Blank | Minimal block rendering and custom CSS starts |
| `blog` | Blog | Writing and mixed-media streams |
| `campaign` | Campaign | Full-screen landing pages |
| `case-study` | Case Study | Structured project narratives |
| `changelog` | Changelog | Chronological product updates |
| `course` | Course | Syllabi, workshops, modules, learning tracks |
| `custom` | Custom | AI-assisted theme and CSS output using a blog-style base |
| `directory` | Directory | Searchable/sortable lists with hover previews and per-block pages |
| `document` | Document | Text-heavy documentation with sidebar navigation |
| `ecommerce` | Shop | Product showcases with image gallery and details panel |
| `event` | Event | Conference-style schedules, details, and registration links |
| `feature-requests` | Feature Requests | Request boards where comments count as votes |
| `feed` | Feed | Responsive channel-style grids |
| `finder` | Finder | Full-window file browser layouts |
| `gallery` | Gallery | Masonry grids with full detail dialogs |
| `homepage` | Homepage | Single-page landing pages with hero image and link list |
| `library` | Library | Catalog-style indexes for document-heavy channels |
| `link-in-bio` | Link in Bio | Mobile profile pages and primary links |
| `map` | Map / Places | Location-style lists with coordinate metadata from block text |
| `photography` | Photography Story | Cinematic image grids and narrative breaks |
| `portfolio` | Portfolio | Sparse visual showcases |
| `presentation` | Presentation | Full-screen slide decks |
| `press-kit` | Press Kit | Launch facts, media assets, and downloads |
| `slideshow` | Slideshow | Full-screen image slideshows |
| `team` | Team | Studio/team profiles, capabilities, and links |
| `timeline` | Timeline | Vertical chronological content |

Special build behavior:

- `directory` emits `block-{id}.html` child pages for non-link blocks.
- `feature-requests` emits `block-{id}.html` detail pages and enriches blocks
  with status/tag metadata from bracket labels such as `[in progress]`.
- `photography` uses image dimensions when available to choose bento grid cell
  classes, with a fallback layout cycle.

## Theme tokens

Theme settings are stored separately from site CSS:

- `themeColors`: JSON with `background`, `text`, `accent`, `border`.
- `themeFonts`: JSON with `heading`, `body`.

`PUT /api/sites/[id]/theme` validates theme values before storing them:

- colors must be 3- or 6-digit hex values and are stored as lowercase 6-digit
  hex strings;
- fonts must be `system`, a built-in token, or a curated Google Font token
  such as `gf:Inter`;
- only admins, friends, Pro users, and Studio users can save themes.

Build output exposes theme CSS variables:

```css
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-accent: #555555;
  --color-border: #e5e5e5;
  --tg-font-heading: system-ui, sans-serif;
  --tg-font-body: system-ui, sans-serif;
}
```

Template CSS should consume those variables with fallbacks:

```css
body {
  background: var(--color-bg, #fff);
  color: var(--color-text, #1a1a1a);
  font-family: var(--tg-font-body, system-ui, sans-serif);
}
```

## `styles.css` and override order

Site CSS can come from two places:

1. Saved Tiny Garden site CSS, edited in Site settings -> Theme ->
   `styles.css` and stored as `Site.customCss`.
2. A reserved Are.na block titled `styles.css`.

Saved site CSS wins when it is non-empty. Otherwise Tiny Garden uses the first
matching channel CSS block with CSS content. Reserved `styles.css` blocks are
hidden from the rendered site content.

Build injection order:

1. template `style.css`;
2. favicon and "made with tiny.garden" footer;
3. theme font links and theme override CSS;
4. effective site CSS as `<style id="tiny-garden-site-css">`.

Because effective site CSS is last, user CSS can intentionally override
template defaults and theme-generated rules.

Example channel CSS block:

```css
:root {
  --block-radius: 12px;
}

article img {
  border-radius: var(--block-radius);
}
```

## CSS safety constraints

CSS may come from templates, dashboard editors, preview parameters, or Are.na.
Before CSS is embedded in a `<style>` tag, Tiny Garden escapes `</style` with
`escapeStyleTagContent()` so CSS cannot break out of the style element.

Do not add raw CSS interpolation in new template or preview code. Reuse:

- `src/lib/theme-css-tokens.ts`
- `src/lib/build.ts`
- `src/app/api/templates/preview/route.ts`

## Preview parity

`GET /api/templates/preview` and `POST /api/templates/preview` render templates
with mock data, configured example channels, or a user's real site channel when
`siteId` belongs to the requester. Preview code should stay aligned with
production build behavior for:

- Handlebars helpers;
- theme token names;
- CSS injection order;
- `styles.css` escaping and precedence.

## Common pitfalls

- Derive template lists from `templates/*/meta.json`, not roadmap documents.
- Do not show a `styles.css` Are.na block as content; reserved-title filtering
  should hide it.
- If preview and production differ, compare
  `src/app/api/templates/preview/route.ts` with `applyStaticPageFinishes()` in
  `src/lib/build.ts`.
- If theme saving returns `400`, check hex values and font tokens.
- If a template needs new custom CSS defaults in the editor, update
  `formatStylesCssPlaceholder()` rather than duplicating theme token CSS.
