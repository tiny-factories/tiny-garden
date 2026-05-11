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
  content: string | Record<string, unknown> | null;
  content_html: string | Record<string, unknown> | null;
  image: {
    original: { url: string };
    large: { url: string };
    square: { url: string };
    display: { url: string };
    width?: number | null;
    height?: number | null;
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
  comment_count: number;
  created_at: string;
  updated_at: string;
  /** v3 Image blocks: original dimensions in pixels (when known). */
  width?: number | null;
  height?: number | null;
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

  /** Fetch a single block by its Are.na id (used for refetch after edit). */
  async getBlock(blockId: number): Promise<ArenaBlock> {
    const res = await this.fetch<ArenaBlock | { data: ArenaBlock }>(
      `/blocks/${blockId}`
    );
    return "data" in res && res.data
      ? (res as { data: ArenaBlock }).data
      : (res as ArenaBlock);
  }

  /**
   * Low-level body+method writer. Same rate-limit retry as `fetch()` but for
   * POST/PUT/PATCH/DELETE. Returns parsed JSON or null on 204.
   */
  private async write<T>(
    path: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body?: Record<string, unknown>
  ): Promise<T | null> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed);
    }
    this.lastRequestAt = Date.now();

    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    let res = await fetch(`${ARENA_API}${path}`, init);
    if (res.status === 429) {
      const resetHeader = res.headers.get("X-RateLimit-Reset");
      const resetAt = resetHeader
        ? parseInt(resetHeader, 10) * 1000
        : Date.now() + 60000;
      const waitMs = Math.min(Math.max(resetAt - Date.now(), 1000), 60000);
      await sleep(waitMs);
      this.lastRequestAt = Date.now();
      res = await fetch(`${ARENA_API}${path}`, init);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Are.na ${method} ${path} failed (${res.status} ${res.statusText}): ${text.slice(0, 240)}`
      );
    }
    if (res.status === 204) return null;
    return (await res.json()) as T;
  }

  /**
   * Create a new channel under the authenticated user.
   *
   * `status` matches Are.na's terminology: `"public"` (anyone can read),
   * `"closed"` (read/write only for collaborators), `"private"` (visible only
   * to the owner).
   */
  async createChannel(input: {
    title: string;
    status?: "public" | "closed" | "private";
  }): Promise<ArenaChannel> {
    const body: Record<string, unknown> = { title: input.title };
    if (input.status) body.status = input.status;
    const res = await this.write<ArenaChannel | { data: ArenaChannel }>(
      "/channels",
      "POST",
      body
    );
    if (!res) throw new Error("Are.na channel create returned no body");
    return "data" in res && res.data
      ? (res as { data: ArenaChannel }).data
      : (res as ArenaChannel);
  }

  /** Append a Text block (Markdown allowed) to a channel. */
  async createTextBlock(
    channelSlug: string,
    input: { content: string; title?: string; description?: string }
  ): Promise<ArenaBlock> {
    const body: Record<string, unknown> = { content: input.content };
    if (input.title) body.title = input.title;
    if (input.description) body.description = input.description;
    const res = await this.write<ArenaBlock | { data: ArenaBlock }>(
      `/channels/${encodeURIComponent(channelSlug)}/blocks`,
      "POST",
      body
    );
    if (!res) throw new Error("Are.na block create returned no body");
    return "data" in res && res.data
      ? (res as { data: ArenaBlock }).data
      : (res as ArenaBlock);
  }

  /** Append a Link block (URL with optional title/description) to a channel. */
  async createLinkBlock(
    channelSlug: string,
    input: { url: string; title?: string; description?: string }
  ): Promise<ArenaBlock> {
    const body: Record<string, unknown> = { source: input.url };
    if (input.title) body.title = input.title;
    if (input.description) body.description = input.description;
    const res = await this.write<ArenaBlock | { data: ArenaBlock }>(
      `/channels/${encodeURIComponent(channelSlug)}/blocks`,
      "POST",
      body
    );
    if (!res) throw new Error("Are.na block create returned no body");
    return "data" in res && res.data
      ? (res as { data: ArenaBlock }).data
      : (res as ArenaBlock);
  }

  /**
   * Append an Image block from a hosted URL. Are.na fetches the URL server-side
   * and creates an Image block. Useful when the user pastes an image URL or
   * after we've uploaded a file to a blob host.
   */
  async createImageBlockFromUrl(
    channelSlug: string,
    input: { url: string; title?: string; description?: string }
  ): Promise<ArenaBlock> {
    const body: Record<string, unknown> = { source: input.url };
    if (input.title) body.title = input.title;
    if (input.description) body.description = input.description;
    const res = await this.write<ArenaBlock | { data: ArenaBlock }>(
      `/channels/${encodeURIComponent(channelSlug)}/blocks`,
      "POST",
      body
    );
    if (!res) throw new Error("Are.na block create returned no body");
    return "data" in res && res.data
      ? (res as { data: ArenaBlock }).data
      : (res as ArenaBlock);
  }

  /**
   * Update a block on Are.na.
   *
   * Are.na's `PUT /blocks/:id` accepts `title`, `description`, and (for Text
   * blocks) `content`. Image / Media block bodies are not editable through
   * this endpoint; only their title/description.
   */
  async updateBlock(
    blockId: number,
    patch: { title?: string; description?: string | null; content?: string | null }
  ): Promise<ArenaBlock> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed);
    }
    this.lastRequestAt = Date.now();

    const body: Record<string, unknown> = {};
    if (typeof patch.title === "string") body.title = patch.title;
    if (patch.description !== undefined) body.description = patch.description ?? "";
    if (patch.content !== undefined) body.content = patch.content ?? "";

    const res = await fetch(`${ARENA_API}/blocks/${blockId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const resetHeader = res.headers.get("X-RateLimit-Reset");
      const resetAt = resetHeader
        ? parseInt(resetHeader, 10) * 1000
        : Date.now() + 60000;
      const waitMs = Math.min(Math.max(resetAt - Date.now(), 1000), 60000);
      await sleep(waitMs);
      this.lastRequestAt = Date.now();
      const retry = await fetch(`${ARENA_API}/blocks/${blockId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!retry.ok) {
        const text = await retry.text();
        throw new Error(
          `Are.na block update failed (${retry.status} ${retry.statusText}): ${text.slice(0, 240)}`
        );
      }
      const data = (await retry.json()) as ArenaBlock | { data: ArenaBlock };
      return "data" in data && data.data
        ? (data as { data: ArenaBlock }).data
        : (data as ArenaBlock);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Are.na block update failed (${res.status} ${res.statusText}): ${text.slice(0, 240)}`
      );
    }
    // Are.na sometimes returns 204 No Content on PUT. Refetch in that case.
    if (res.status === 204) {
      return this.getBlock(blockId);
    }
    const data = (await res.json()) as ArenaBlock | { data: ArenaBlock };
    return "data" in data && data.data
      ? (data as { data: ArenaBlock }).data
      : (data as ArenaBlock);
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

  async getGroupChannels(groupSlug: string): Promise<ArenaChannel[]> {
    try {
      const channels: ArenaChannel[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await this.fetch<{ data: ArenaChannel[]; meta: { has_more_pages: boolean } }>(`/groups/${groupSlug}/contents`, {
          per: "100",
          page: String(page),
          type: "Channel",
        });
        channels.push(...(data.data || []));
        hasMore = data.meta?.has_more_pages ?? false;
        page++;
      }

      return channels;
    } catch (e) {
      console.error(`Failed to fetch group channels for ${groupSlug}:`, e);
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
      groups.map((g) => this.getGroupChannels(g.slug))
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
