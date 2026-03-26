const ARENA_API = "https://api.are.na/v3";

export interface ArenaChannel {
  id: number;
  title: string;
  slug: string;
  description: string;
  length: number;
  counts?: { contents: number };
  created_at: string;
  updated_at: string;
  // v2 used "user", v3 uses "owner"
  user?: {
    id: number;
    slug: string;
    full_name: string;
    avatar_image: { display: string };
  };
  owner?: {
    id: number;
    slug: string;
    name?: string;
    full_name?: string;
    username?: string;
    avatar?: string;
    avatar_image?: { display: string };
  };
}

export interface ArenaBlock {
  id: number;
  class?: "Image" | "Text" | "Link" | "Media" | "Attachment";
  type?: string; // v3 uses "type" instead of "class"
  title: string;
  description: string | null;
  content: string | null;
  content_html: string | null;
  image: {
    original: { url: string };
    large: { url: string };
    square: { url: string };
    display: { url: string };
  } | null;
  source: {
    url: string;
    title: string;
    description: string;
    provider: { name: string };
  } | null;
  embed: {
    url: string;
    html: string;
  } | null;
  attachment: {
    url: string;
    file_name: string;
    file_size: number;
    content_type: string;
  } | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export class ArenaClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${ARENA_API}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Are.na API error: ${res.status} ${url.toString()}`, body);
      throw new Error(`Are.na API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  async getChannel(slug: string): Promise<ArenaChannel> {
    // v3 may wrap in { data: ... } or return directly
    const res = await this.fetch<ArenaChannel | { data: ArenaChannel }>(`/channels/${slug}`);
    return "data" in res && res.data ? (res as { data: ArenaChannel }).data : res as ArenaChannel;
  }

  async getChannelBlocks(
    slug: string,
    page = 1,
    per = 100
  ): Promise<{ data: ArenaBlock[]; meta: { total_pages: number; has_more_pages: boolean } }> {
    return this.fetch(`/channels/${slug}/contents`, {
      page: String(page),
      per: String(per),
    });
  }

  async getAllChannelBlocks(slug: string): Promise<ArenaBlock[]> {
    const blocks: ArenaBlock[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await this.getChannelBlocks(slug, page, 100);
      blocks.push(...(res.data || []));
      hasMore = res.meta?.has_more_pages ?? false;
      page++;
    }

    return blocks;
  }

  async getMe(): Promise<{ id: number; slug: string; full_name: string; avatar_image: { display: string } }> {
    return this.fetch("/me");
  }

  async getUserChannels(userId: number): Promise<ArenaChannel[]> {
    const data = await this.fetch<{ data: ArenaChannel[] }>(`/users/${userId}/contents`, {
      per: "100",
      type: "Channel",
      sort: "updated_at_desc",
    });
    return data.data;
  }
}
