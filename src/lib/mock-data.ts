/**
 * Mock Are.na channel data for template previews.
 *
 * Used by the /api/templates/preview route and the /templates gallery page.
 * Matches the SiteData shape from src/lib/build.ts so templates render
 * identically whether they're fed real or mock data.
 */

import type { SiteData } from "./build";

export const MOCK_SITE_DATA: SiteData = {
  channel: {
    title: "Design Research Archive",
    slug: "design-research-archive",
    description:
      "A collection of references, notes, and visual material exploring the intersection of design, technology, and culture.",
    user: {
      name: "Anna K.",
      slug: "anna-k",
      avatar_url: "",
    },
    created_at: "2024-06-15T10:00:00.000Z",
    updated_at: "2026-03-20T14:30:00.000Z",
    length: 8,
  },
  blocks: [
    {
      id: 1,
      type: "image",
      title: "Superstudio, The Continuous Monument",
      description: "",
      created_at: "2024-06-15T10:01:00.000Z",
      updated_at: "2024-06-15T10:01:00.000Z",
      position: 0,
      image: {
        original: "https://picsum.photos/seed/arena1/1200/800",
        large: "https://picsum.photos/seed/arena1/1024/683",
        square: "https://picsum.photos/seed/arena1/300/300",
        display: "https://picsum.photos/seed/arena1/800/533",
      },
      source_url: null,
    },
    {
      id: 2,
      type: "text",
      title: "",
      description: "",
      created_at: "2024-06-16T09:00:00.000Z",
      updated_at: "2024-06-16T09:00:00.000Z",
      position: 1,
      content:
        "<p>The most interesting design work happens at the boundaries between disciplines. When we stop treating design as a service profession and start treating it as a way of thinking, new possibilities emerge.</p><p>See also: <a href='#'>Christopher Alexander</a>, <em>A Pattern Language</em></p>",
      source_url: null,
    },
    {
      id: 3,
      type: "image",
      title: "Diagram, Cedric Price — Fun Palace",
      description: "",
      created_at: "2024-06-17T11:00:00.000Z",
      updated_at: "2024-06-17T11:00:00.000Z",
      position: 2,
      image: {
        original: "https://picsum.photos/seed/arena2/1200/900",
        large: "https://picsum.photos/seed/arena2/1024/768",
        square: "https://picsum.photos/seed/arena2/300/300",
        display: "https://picsum.photos/seed/arena2/800/600",
      },
      source_url: null,
    },
    {
      id: 4,
      type: "link",
      title: "The Web as a City — Robin Sloan",
      description:
        "An essay on the web as urban space, with neighborhoods, parks, and infrastructure.",
      created_at: "2024-06-18T14:00:00.000Z",
      updated_at: "2024-06-18T14:00:00.000Z",
      position: 3,
      link: {
        url: "https://example.com/web-as-city",
        title: "The Web as a City — Robin Sloan",
        description:
          "An essay on the web as urban space, with neighborhoods, parks, and infrastructure.",
        thumbnail: "https://picsum.photos/seed/arena3/400/300",
        provider: "example.com",
      },
      source_url: "https://example.com/web-as-city",
    },
    {
      id: 5,
      type: "image",
      title: "",
      description: "",
      created_at: "2024-06-19T08:00:00.000Z",
      updated_at: "2024-06-19T08:00:00.000Z",
      position: 4,
      image: {
        original: "https://picsum.photos/seed/arena4/1200/1600",
        large: "https://picsum.photos/seed/arena4/768/1024",
        square: "https://picsum.photos/seed/arena4/300/300",
        display: "https://picsum.photos/seed/arena4/600/800",
      },
      source_url: null,
    },
    {
      id: 6,
      type: "text",
      title: "Note on interfaces",
      description: "",
      created_at: "2024-06-20T10:00:00.000Z",
      updated_at: "2024-06-20T10:00:00.000Z",
      position: 5,
      content:
        "<h2>On Interfaces</h2><p>An interface is not a surface. It is a <em>relationship</em> between two systems, mediated by a shared boundary. The best interfaces disappear — they become the activity itself.</p>",
      source_url: null,
    },
    {
      id: 7,
      type: "image",
      title: "Archigram, Instant City",
      description: "",
      created_at: "2024-06-21T12:00:00.000Z",
      updated_at: "2024-06-21T12:00:00.000Z",
      position: 6,
      image: {
        original: "https://picsum.photos/seed/arena5/1200/700",
        large: "https://picsum.photos/seed/arena5/1024/600",
        square: "https://picsum.photos/seed/arena5/300/300",
        display: "https://picsum.photos/seed/arena5/800/467",
      },
      source_url: null,
    },
    {
      id: 8,
      type: "attachment",
      title: "reading-list.pdf",
      description: "",
      created_at: "2024-06-22T15:00:00.000Z",
      updated_at: "2024-06-22T15:00:00.000Z",
      position: 7,
      attachment: {
        url: "#",
        file_name: "reading-list.pdf",
        file_size: 245000,
        content_type: "application/pdf",
      },
      source_url: "#",
    },
  ],
  site: {
    subdomain: "preview",
    url: "https://preview.tiny.garden",
    template: "blog",
    custom_css: "",
    built_at: new Date().toISOString(),
  },
};
