# Template Drafts (Missing / To Be Developed)

This document drafts templates that are **not yet shipped** in `/templates`, with implementation-ready scopes.

Current shipped templates:
- blog
- portfolio
- gallery
- timeline
- document
- homepage
- feed
- shop (ecommerce)
- slideshow
- presentation
- campaign
- feature-requests
- blank

## How to read these drafts

Each draft includes:
- **Primary use case**
- **Best-fit users**
- **MVP behavior** (block-level)
- **V2 enhancements**
- **Implementation notes** (for tiny.garden template system)

---

## 1) Link in Bio

**Primary use case**  
Mobile-first single page with key outbound links, short profile, and social actions.

**Best-fit users**  
Creators, musicians, artists, independent founders.

**MVP behavior**
- Channel/title: hero identity section.
- Link blocks: primary CTA list (title + optional description).
- Image blocks: avatar/cover and optional gallery strip.
- Text blocks: short bio/about sections.
- Media blocks: optional embedded trailer/intro.
- Attachment blocks: downloadables (EPK, resume, one-sheet) with clean labels.

**V2 enhancements**
- Button style presets (stacked, pills, cards).
- Analytics-friendly link grouping and UTM hints.
- Theme presets optimized for Instagram/TikTok profile links.

**Implementation notes**
- Keep layout fully responsive and touch-first.
- Reuse normalized attachment fields (`display_name`, `type_label`, preview metadata).

---

## 2) Map / Places

**Primary use case**  
Geographic storytelling and location-based archives.

**Best-fit users**  
Researchers, travel writers, urbanists, event teams.

**MVP behavior**
- Layout: split map + list.
- Link/Text/Image blocks: list entries with location metadata parsed from title/description conventions.
- Marker click: opens item detail card with media and outbound link.
- Attachment blocks: downloadable location documents (PDFs, guides, datasets).

**V2 enhancements**
- Cluster markers.
- Date or tag filters.
- Route and itinerary mode.

**Implementation notes**
- Define a simple location convention (example: `lat,lon` in first line or description prefix).
- Preserve fallback to list-only mode when no coordinates exist.

---

## 3) Photography Story

**Primary use case**  
Photo-led editorial storytelling with sequence control and caption depth.

**Best-fit users**  
Photographers, visual editors, documentary creators.

**MVP behavior**
- Image blocks: dominant full-width or masonry sequence.
- Title/description: caption and context row.
- Text blocks: chapter separators and narrative inserts.
- Link blocks: references, publication links.
- Attachment blocks: high-res set download/contact sheet.

**V2 enhancements**
- EXIF display toggles (camera/lens/shutter/ISO).
- Lightbox with keyboard and swipe gestures.
- Print/contact-sheet mode.

**Implementation notes**
- Prioritize image quality and aspect-ratio-safe rendering.
- Use attachment type metadata for media-safe download rows.

---

## 4) Case Study / Project Breakdown

**Primary use case**  
Structured project narratives: problem, process, solution, outcome.

**Best-fit users**  
Design studios, product teams, agencies.

**MVP behavior**
- Intro section from channel title/description.
- Ordered sections from Text blocks (`Challenge`, `Approach`, `Outcome`, etc.).
- Image/Media blocks embedded within sections.
- Link blocks for references, prototypes, repos.
- Attachment blocks for deliverables and PDFs.

**V2 enhancements**
- KPI/result callout blocks.
- Before/after comparison module.
- Testimonial strip.

**Implementation notes**
- Use existing timeline/document conventions for readable long-form flow.
- Add section heading detection from text title prefixes.

---

## 5) Finder / Document Viewer (Stable)

**Primary use case**  
Knowledge base for text/link/PDF-heavy channels with stable reading experience.

**Best-fit users**  
Research, policy, legal, archive, operations teams.

**MVP behavior**
- Two-pane interface:
  - left: document list + filters
  - right: preview/details
- Text blocks: rendered as notes/summaries.
- Link blocks: source cards.
- Attachment blocks:
  - PDF inline preview when available
  - video/audio inline where supported
  - 3D/archive as clear download fallback
- Date sorting in clean UTC format.

**V2 enhancements**
- Full-text client search.
- Saved filters and pinned docs.
- Keyboard navigation similar to Finder.

**Implementation notes**
- Build on normalized attachment metadata already in place.
- Keep rendering deterministic and accessible (focus states + keyboard support).

---

## 6) Directory / Resource Library

**Primary use case**  
Curated resource indexes with category/tag browsing.

**Best-fit users**  
Curators, educators, niche communities, nonprofits.

**MVP behavior**
- Card/list toggle.
- Category filter from title/description tags.
- Link blocks as primary resources.
- Text blocks as section intros.
- Attachment blocks as downloadable resources.

**V2 enhancements**
- Multi-filter facets (topic, format, date).
- Featured/pinned resources.
- “Recently added” lane.

**Implementation notes**
- Implement fast client-side filtering for medium channels.
- Include graceful no-result states.

---

## 7) Library / Catalog

**Primary use case**  
Catalog-style collections with bibliographic-style metadata rows.

**Best-fit users**  
Libraries, museums, publishers, archives.

**MVP behavior**
- Dense index view with sortable columns:
  - title
  - type
  - date
  - source
- Detail panel with preview.
- Attachment blocks prioritized for PDFs/documents.

**V2 enhancements**
- Metadata templates (author/year/publisher fields via conventions).
- Export view (CSV/JSON).
- Citation copy actions.

**Implementation notes**
- Start with convention-based metadata parsing from title/description.
- Keep fallback rendering robust when fields are missing.

---

## 8) Changelog / Product Updates

**Primary use case**  
Public update log for products/projects shipping frequently.

**Best-fit users**  
Startups, OSS maintainers, product teams.

**MVP behavior**
- Chronological entries (newest first).
- Text blocks: release notes.
- Link blocks: release URLs/issues.
- Media/Image blocks: release visuals.
- Attachment blocks: release artifacts/downloads.

**V2 enhancements**
- Version badge parsing (`vX.Y.Z`).
- Category chips (fix/improvement/breaking).
- RSS/Atom feed output.

**Implementation notes**
- Reuse timeline-like date treatment (`YYYY-MM-DD HH:mm` UTC).

---

## 9) Event / Conference Microsite

**Primary use case**  
Single-channel event site: schedule, speakers, venue, sponsors.

**Best-fit users**  
Conference teams, collectives, schools, art spaces.

**MVP behavior**
- Hero + event facts.
- Text blocks for schedule sections.
- Image blocks for speakers/sponsors.
- Link blocks for registration and speaker links.
- Attachment blocks for program PDFs and maps.

**V2 enhancements**
- Multi-day schedule tabs.
- Speaker detail overlays.
- ICS calendar export links.

**Implementation notes**
- Time display should be clean and consistent (24h option).

---

## 10) Team / Studio Profile

**Primary use case**  
Compact team site with people, capabilities, and selected work.

**Best-fit users**  
Small studios, agencies, collectives, nonprofit teams.

**MVP behavior**
- Intro section with mission statement.
- People cards from image/text conventions.
- Link blocks for socials/work/contact.
- Media blocks for reel/overview.
- Attachments for capability decks.

**V2 enhancements**
- Team member filtering by role.
- Client logo strip.
- Hiring/open-call module.

**Implementation notes**
- Can reuse portfolio + homepage visual patterns.

---

## 11) Course / Syllabus

**Primary use case**  
Structured course pages with weekly modules and resources.

**Best-fit users**  
Teachers, workshop hosts, learning communities.

**MVP behavior**
- Module sections from text titles.
- Reading/resource lists via links and attachments.
- Image/media for examples and lecture embeds.
- Date rows for week-by-week rhythm.

**V2 enhancements**
- Progress/checklist mode.
- Assignment submission link conventions.
- Print-friendly syllabus export.

**Implementation notes**
- Prioritize accessibility and long-form readability.

---

## 12) Press Kit / Media Room

**Primary use case**  
Centralized media assets and facts for launches/press outreach.

**Best-fit users**  
Startups, labels, artists, publishers.

**MVP behavior**
- Boilerplate section from text.
- Press links and coverage list.
- Logo/image asset packs.
- Attachment blocks for downloadable kit files (PDF, ZIP).

**V2 enhancements**
- “Latest coverage” auto section convention.
- Region/language variants.
- One-click ZIP bundling (if platform support is added later).

**Implementation notes**
- Use attachment type labeling heavily for clarity.

---

## Suggested shipping sequence (draft implementation order)

1. Link in Bio  
2. Map / Places  
3. Photography Story  
4. Finder / Document Viewer (Stable)  
5. Case Study / Project Breakdown  
6. Directory / Resource Library  
7. Library / Catalog  
8. Changelog  
9. Event / Conference  
10. Team / Studio  
11. Course / Syllabus  
12. Press Kit / Media Room

