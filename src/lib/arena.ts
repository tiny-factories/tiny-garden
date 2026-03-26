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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ArenaClient {
  private token: string;
  private lastRequestAt = 0;
  private minInterval = 300; // ms between requests

  constructor(token: string) {
    this.token = token;
  }

  private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    // Enforce minimum interval between requests
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed);
    }
    this.lastRequestAt = Date.now();

    const url = new URL(`${ARENA_API}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    // Handle rate limiting — wait and retry once
    if (res.status === 429) {
      const resetHeader = res.headers.get("X-RateLimit-Reset");
      const resetAt = resetHeader ? parseInt(resetHeader, 10) * 1000 : Date.now() + 60000;
      const waitMs = Math.min(Math.max(resetAt - Date.now(), 1000), 60000);
      console.warn(`Are.na rate limited on ${path}, waiting ${waitMs}ms`);
      await sleep(waitMs);

      // Retry once
      this.lastRequestAt = Date.now();
      const retryRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!retryRes.ok) {
        const body = await retryRes.text();
        console.error(`Are.na API error after retry: ${retryRes.status} ${url.toString()}`, body);
        throw new Error(`Are.na API error: ${retryRes.status} ${retryRes.statusText}`);
      }
      return retryRes.json() as Promise<T>;
    }

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

  async searchChannels(query: string): Promise<ArenaChannel[]> {
    try {
      const data = await this.fetch<{ data: ArenaChannel[] }>("/search", {
        q: query,
        type: "Channel",
        per: "20",
      });
      return data.data || [];
    } catch {
      return [];
    }
  }

  async getUserChannels(userId: number): Promise<ArenaChannel[]> {
    const channels: ArenaChannel[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const data = await this.fetch<{ data: ArenaChannel[]; meta: { has_more_pages: boolean } }>(`/users/${userId}/contents`, {
        per: "100",
        page: String(page),
        type: "Channel",
        sort: "updated_at_desc",
      });
      channels.push(...(data.data || []));
      hasMore = data.meta?.has_more_pages ?? false;
      page++;
    }

    return channels;
  }

  async getUserGroups(userId: number): Promise<{ id: number; slug: string; name?: string }[]> {
    try {
      const data = await this.fetch<{ data: { id: number; slug: string; name?: string }[] }>(`/users/${userId}/groups`, {
        per: "100",
      });
      return data.data || [];
    } catch {
      return [];
    }
  }

  async getGroupChannels(groupId: number): Promise<ArenaChannel[]> {
    try {
      const channels: ArenaChannel[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await this.fetch<{ data: ArenaChannel[]; meta: { has_more_pages: boolean } }>(`/users/${groupId}/contents`, {
          per: "100",
          page: String(page),
          type: "Channel",
          sort: "updated_at_desc",
        });
        channels.push(...(data.data || []));
        hasMore = data.meta?.has_more_pages ?? false;
        page++;
      }

      return channels;
    } catch {
      return [];
    }
  }

  async getFollowingChannels(userId: number): Promise<ArenaChannel[]> {
    try {
      const channels: ArenaChannel[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await this.fetch<{ data: Array<ArenaChannel & { type?: string; base_type?: string }>; meta: { has_more_pages: boolean } }>(`/users/${userId}/following`, {
          per: "100",
          page: String(page),
          type: "Channel",
        });
        // Filter to channels only (following can include users too)
        const ch = (data.data || []).filter(
          (item) => item.base_type === "Channel" || item.type === "Channel"
        );
        channels.push(...ch);
        hasMore = data.meta?.has_more_pages ?? false;
        page++;
      }

      return channels;
    } catch {
      return [];
    }
  }

  async getAllUserChannels(userId: number): Promise<ArenaChannel[]> {
    // Get user's own channels
    const ownChannels = await this.getUserChannels(userId);

    // Get channels from groups/teams
    const groups = await this.getUserGroups(userId);
    const groupChannelArrays = await Promise.all(
      groups.map((g) => this.getGroupChannels(g.id))
    );

    // Get channels user follows/collaborates on
    const followingChannels = await this.getFollowingChannels(userId);

    // Merge and deduplicate by id
    const allChannels = [...ownChannels, ...groupChannelArrays.flat(), ...followingChannels];
    const seen = new Set<number>();
    return allChannels.filter((ch) => {
      if (seen.has(ch.id)) return false;
      seen.add(ch.id);
      return true;
    });
  }
}
