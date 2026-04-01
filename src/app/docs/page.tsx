import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs — Block rendering",
  description:
    "How tiny.garden maps Are.na blocks to site templates: image, text, link, media, and attachment.",
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
      "attachment.url, file_name, optional preview via image.display when Are.na provides one",
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
      "Attachment: preview image if present, download row, optional description.",
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
      "Attachment: preview image if present, file name link.",
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
      "Attachment: preview + file name link.",
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
      "Attachment: preview + download control.",
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
      "Attachment: optional preview + file link.",
    ],
  },
  {
    id: "timeline",
    name: "Timeline",
    summary: "Vertical timeline with created_at on each entry.",
    notes: [
      "Same broad pattern as Blog: image / text / link card / media / attachment, with dates at the top of each entry.",
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
      "Attachment: optional title, preview image, download row.",
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
      "Attachment: preview + download.",
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
      "Attachment: preview + download.",
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
      "Attachment: constrained preview + large download control.",
    ],
  },
  {
    id: "feature-requests",
    name: "Feature Requests",
    summary: "Each block is a card linking to the block on Are.na; comment count is shown as votes.",
    notes: [
      "Image: title, description, and thumbnail image.",
      "Text: title plus HTML body, or description if there is no body.",
      "Link: prefers block title/description, falls back to link title/description; the card does not surface the URL (whole card goes to Are.na).",
      "Media: only title and description — embed HTML is not rendered in this template.",
      "Attachment: preview, title or file name, description.",
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
