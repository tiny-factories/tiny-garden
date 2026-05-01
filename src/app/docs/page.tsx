import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs — Block rendering",
  description:
    "How tiny.garden maps Are.na blocks to site templates (image, text, link, media, attachment), including Gallery and other layouts.",
};

const blockTypes = [
  {
    type: "image",
    arena: "Image",
    fields:
      "title, description, image sizes (display for most layouts, original where noted)",
  },
  {
    type: "text",
    arena: "Text",
    fields: "title, description, content (HTML from Are.na)",
  },
  {
    type: "link",
    arena: "Link",
    fields:
      "link.url, link.title, link.description, link.thumbnail (often from preview image)",
  },
  {
    type: "media",
    arena: "Media, Embed",
    fields:
      "embed.html (iframe or embed markup), title, description — both Are.na Media and Embed blocks become this type",
  },
  {
    type: "attachment",
    arena: "Attachment",
    fields:
      "attachment.url, file_name, display_name, alt_text, attachment.kind, attachment.extension, attachment.preview_url, attachment.has_visual_preview",
  },
] as const;

const templates: {
  id: string;
  name: string;
  summary: string;
  notes: string[];
}[] = [
  {
    id: "blog",
    name: "Blog",
    summary: "One article-style card per block, with headings and lead copy where the template supports it.",
    notes: [
      "Image: display size, title, description.",
      "Text: optional title, HTML body, optional description below.",
      "Link: optional thumbnail, link title and description inside one clickable card.",
      "Media: embed, optional title and description.",
      "Attachment: supports richer previews by file type (image/GIF, video, PDF); model and unknown files fall back to label + download.",
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    summary: "Sparse, gallery-oriented layout; favors large imagery.",
    notes: [
      "Image: original-resolution URL, caption from block title only.",
      "Text: HTML body only (no separate title line in the partial).",
      "Link: thumbnail, title, and description in a horizontal card.",
      "Media: embed only.",
      "Attachment: preview image/video/PDF when possible, title/description-aware label fallback.",
    ],
  },
  {
    id: "feed",
    name: "Feed",
    summary: "Tight tiles; block title appears as a shared caption when set.",
    notes: [
      "Image: display size.",
      "Text: HTML body.",
      "Link: optional thumbnail and link title; block title (if any) is shown as caption for every block type at the bottom of the tile.",
      "Media: embed.",
      "Attachment: preview + title/description-aware label (fallback to file name), with file-type awareness.",
    ],
  },
  {
    id: "gallery",
    name: "Gallery",
    summary:
      "Masonry-style column grid of thumbnails; each block opens in a full-screen dialog with image (or embed) and description, similar to a museum wall label.",
    notes: [
      "Image: display in the grid; large (or display) image in the dialog; block title and description; date and Are.na link.",
      "Text: compact “Text” tile; dialog shows title, optional description, and full HTML body.",
      "Link: thumbnail or title fallback in the grid; dialog shows image, link title, descriptions, and an “Open link” action.",
      "Media: scaled embed in the grid; full embed plus title, description, and source link in the dialog.",
      "Attachment: preview image/video/PDF or display label in the grid; dialog includes download and file-type fallback behavior.",
      "Uses the native HTML dialog element and loads copy from each block’s template fragment (no extra network request).",
    ],
  },
  {
    id: "slideshow",
    name: "Slideshow",
    summary: "Each block is one full slide.",
    notes: [
      "Image: original URL, caption from block title.",
      "Text: centered HTML.",
      "Link: uses block preview image (image.display) when available, not always the same as link.thumbnail; caption links out with link title.",
      "Media: full-slide embed.",
      "Attachment: preview + download control, including video and PDF when available.",
    ],
  },
  {
    id: "blank",
    name: "Blank",
    summary: "Minimal markup — useful as a starting point for custom CSS.",
    notes: [
      "Image: display size.",
      "Text: raw HTML.",
      "Link: plain anchor with link title.",
      "Media: raw embed HTML.",
      "Attachment: optional preview + title/description-aware file link; model/archive files show safe fallback.",
    ],
  },
  {
    id: "timeline",
    name: "Timeline",
    summary: "Vertical timeline with clean UTC date/time labels on each entry.",
    notes: [
      "Same broad pattern as Blog: image / text / link card / media / attachment, with dates rendered as YYYY-MM-DD HH:mm (24-hour UTC) at the top of each entry.",
      "Link: card with thumbnail, link title, and link description.",
    ],
  },
  {
    id: "document",
    name: "Document",
    summary: "Long-form reading; figures link to the full-size image.",
    notes: [
      "Text: optional title, then HTML body.",
      "Image: optional title, figure linking to image.original, figcaption from block description.",
      "Link: optional block title, then card with thumbnail, link title, description, and visible URL.",
      "Media: optional title, embed.",
      "Attachment: optional title, preview image/video/PDF, download row.",
    ],
  },
  {
    id: "directory",
    name: "Directory",
    summary:
      "Single continuous list with client-side search; a four-button sort toolbar (inline Lucide SVGs) defaults to A–Z by row title label.",
    notes: [
      "Each block is one row: Link blocks open their outbound URL (upper-right arrow when off are.na); all other block types open a static child page on the same site (`block-{id}.html`) with full content and a “View on Are.na” link. Child pages are emitted at build time next to `index.html` and are served from blob storage or `generated/` like the home page.",
      "Hovering a row shows a large floating preview that follows the pointer: images and link thumbnails as before; Text blocks show a plain-text excerpt; PDF attachments embed in a small viewer; other types fall back to a type chip when there is no visual.",
      "Search filters rows client-side. Alphabetical sorts use the same label as the list row (`directoryLabel` / `data-sort-label`): A–Z restores the server build order; Z–A re-sorts those labels in reverse with a stable tie-break on block id. Date sorts order by `created_at` only.",
      "Sort toolbar icons match Lucide v1 paths inlined in `templates/directory/index.hbs` (stroke, `currentColor`): ArrowDownAZ → A–Z, ArrowDownZA → Z–A, CalendarArrowDown → newest first, CalendarArrowUp → oldest first. Titles and `aria-label` describe each action for tooltips and AT.",
    ],
  },
  {
    id: "homepage",
    name: "Homepage",
    summary: "Landing page: hero, link list, then supporting blocks.",
    notes: [
      "All Link blocks render in the hero as a simple text list (link title or URL). They are not repeated in the section below.",
      "The first Image block is used as the full-viewport hero background (via original URL when available) and is hidden from the content list below.",
      "Below the fold, the block partial covers image, text, media, and attachment only (same shapes as other templates, without link).",
    ],
  },
  {
    id: "ecommerce",
    name: "Shop",
    summary: "Product-style sections: big imagery, description copy, CTAs.",
    notes: [
      "Image: original URL and optional caption from title.",
      "Text: product-style HTML body.",
      "Link: prominent button using link title or “View Link”, optional description as subtext.",
      "Media: embed.",
      "Attachment: preview + download, with media/PDF rendering when source allows embedding.",
    ],
  },
  {
    id: "campaign",
    name: "Campaign",
    summary: "Marketing sections with strong titles and descriptions.",
    notes: [
      "Image: display with data attribute for full original; title and description.",
      "Text: title and HTML body.",
      "Link: card with thumbnail, link title, link description.",
      "Media: title, embed.",
      "Attachment: preview + download, with richer previews for video/PDF/image attachments.",
    ],
  },
  {
    id: "presentation",
    name: "Presentation",
    summary: "Slide deck: one block per slide.",
    notes: [
      "Image: original in a figure, optional figcaption from title.",
      "Text: HTML on a slide.",
      "Link: card with image.display, link title, and URL line.",
      "Media: centered embed.",
      "Attachment: constrained preview for image/video/PDF + large download control.",
    ],
  },
  {
    id: "feature-requests",
    name: "Feature Requests",
    summary:
      "Registry rows link to static child pages (block-{id}.html) with full content; each page links to Are.na. Comment count is votes.",
    notes: [
      "Tags: put labels in square brackets in titles or descriptions, e.g. `[Navigation]` `[in progress]` `[done]`. The build finds bracket labels that recur across the channel (or that you list in the channel description) and turns them into filter chips; each row’s category column is the first non-status bracket, and status comes from the first status-like bracket (`[in progress]`, `[done]`, …), a `Status:` line, or comment count.",
      "Image: title, description, and thumbnail image.",
      "Text: title plus HTML body, or description if there is no body.",
      "Link: prefers block title/description, falls back to link title/description; the card links to the child page (open the outbound link on the detail page).",
      "Media: title and description on the index row; embed HTML appears on the child page.",
      "Attachment: preview when available, title/description-aware label, description.",
    ],
  },
  {
    id: "library-proposed",
    name: "Library (proposed)",
    summary:
      "Finder-like knowledge browser for document-heavy channels, with stable reading and predictable metadata.",
    notes: [
      "Two-pane layout: left for sections/filters, right for document preview and metadata.",
      "Prioritizes text, link, and attachment blocks; image/media blocks become supplementary references.",
      "Attachment labels should prefer title/description before falling back to file name.",
      "Dates should stay clean and sortable in UTC using YYYY-MM-DD and optional HH:mm (24-hour).",
      "Designed for research teams, archives, policy/legal docs, and internal knowledge bases.",
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-8">
        <p className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
          Documentation
        </p>
        <h1 className="text-2xl font-medium tracking-tight text-neutral-950 dark:text-neutral-50">Blocks and templates</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-6 max-w-lg leading-relaxed">
          When you publish a site, tiny.garden pulls every block from your Are.na channel,
          normalizes it into one of five types, and your chosen template decides how that
          data is laid out on the page. Block order follows your channel on Are.na.
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4 max-w-lg leading-relaxed">
          Templates are{" "}
          <a
            href="https://github.com/tiny-factories/tiny-garden/tree/main/templates"
            className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Handlebars partials
          </a>
          ; this page describes the behavior users see in the browser.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12 border-t border-neutral-100 dark:border-neutral-800">
        <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-6">
          From Are.na to block types
        </h2>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-sm text-left border-collapse min-w-lg">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-wider">
                <th className="py-2 pr-4 font-medium align-bottom">Are.na block</th>
                <th className="py-2 pr-4 font-medium align-bottom">Site type</th>
                <th className="py-2 font-medium align-bottom">What the template reads</th>
              </tr>
            </thead>
            <tbody className="text-neutral-600 dark:text-neutral-400">
              {blockTypes.map((row) => (
                <tr key={row.type} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-3 pr-4 align-top text-neutral-900 dark:text-neutral-100">{row.arena}</td>
                  <td className="py-3 pr-4 align-top font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {row.type}
                  </td>
                  <td className="py-3 align-top leading-relaxed">{row.fields}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-6 leading-relaxed max-w-lg">
          Every block also carries metadata such as{" "}
          <span className="font-mono text-neutral-500 dark:text-neutral-400">id</span>,{" "}
          <span className="font-mono text-neutral-500 dark:text-neutral-400">position</span>,{" "}
          <span className="font-mono text-neutral-500 dark:text-neutral-400">created_at</span>, and a link back to
          Are.na. Templates use these fields only when they need them (for example, dates on
          Timeline, or comment count on Feature Requests).
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3 leading-relaxed max-w-lg">
          Attachment blocks also expose normalized display metadata so templates can show cleaner labels:
          <span className="font-mono text-neutral-500 dark:text-neutral-400"> attachment.display_name</span> (title/description first, then file name) and
          <span className="font-mono text-neutral-500 dark:text-neutral-400"> attachment.alt_text</span>.
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3 leading-relaxed max-w-lg">
          Attachments now include file-type metadata for richer rendering:
          <span className="font-mono text-neutral-500 dark:text-neutral-400"> attachment.kind</span>,
          <span className="font-mono text-neutral-500 dark:text-neutral-400"> attachment.extension</span>,
          <span className="font-mono text-neutral-500 dark:text-neutral-400"> attachment.preview_url</span>, and
          <span className="font-mono text-neutral-500 dark:text-neutral-400"> attachment.has_visual_preview</span>.
          This enables templates to render GIF/image, video, and PDF previews while falling back gracefully for model files
          (such as STL/OBJ) and other non-previewable formats.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12 border-t border-neutral-100 dark:border-neutral-800">
        <h2 className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-6">
          By template
        </h2>
        <ul className="space-y-12">
          {templates.map((t) => (
            <li key={t.id}>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t.name}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed max-w-lg">
                {t.summary}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-lg list-disc pl-5">
                {t.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12 border-t border-neutral-100 dark:border-neutral-800 pb-20">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          <Link
            href="/"
            className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            Home
          </Link>
          {" · "}
          <Link
            href="/about"
            className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            About
          </Link>
        </p>
      </section>
    </main>
  );
}
