/** Public Are.na channel used for tiny.garden feature requests (no auth required for read). */

export const FEATURE_REQUESTS_ARENA_URL =
  "https://www.are.na/tiny-factories/tiny-garden-feature-requests";

const CHANNEL_SLUG = "tiny-garden-feature-requests";
const API = "https://api.are.na/v3";

type ArenaV3Channel = {
  title: string;
  updated_at: string;
  slug: string;
};

type ArenaV3Block = {
  id: number;
  type: string;
  title: string | null;
  comment_count: number;
  created_at: string;
  content?: { plain?: string; markdown?: string } | null;
  description?: string | null;
  source?: { url?: string; title?: string } | null;
  connection?: { position?: number } | null;
};

export type FeatureRequestItem = {
  id: number;
  type: string;
  title: string | null;
  commentCount: number;
  createdAt: string;
  summary: string;
  blockUrl: string;
  position: number;
};

function blockSummary(b: ArenaV3Block): string {
  const content = b.content;
  const plain =
    (typeof content === "object" && content?.plain) ||
    (typeof content === "object" && content?.markdown) ||
    "";
  const desc = b.description?.trim() || "";
  const title = b.title?.trim() || "";
  const body = plain.trim();

  if (title && body) {
    const firstLine = body.split("\n")[0]?.replace(/^#+\s*/, "").trim() || "";
    if (firstLine === title || body === title) return body;
    return `${title}\n\n${body}`;
  }
  if (title) return title;
  if (body) return body;
  if (desc) return desc;
  if (b.source?.title) return b.source.title;
  return "(no description)";
}

function toItem(b: ArenaV3Block): FeatureRequestItem {
  return {
    id: b.id,
    type: b.type,
    title: b.title,
    commentCount: b.comment_count ?? 0,
    createdAt: b.created_at,
    summary: blockSummary(b),
    blockUrl: `https://www.are.na/block/${b.id}`,
    position: b.connection?.position ?? 0,
  };
}

export async function fetchFeatureRequestChannelAndBlocks(
  fetchInit?: RequestInit
): Promise<{ channel: ArenaV3Channel; blocks: FeatureRequestItem[] }> {
  const init: RequestInit = {
    ...fetchInit,
    headers: { Accept: "application/json", ...fetchInit?.headers },
  };

  const chRes = await fetch(`${API}/channels/${CHANNEL_SLUG}`, init);
  if (!chRes.ok) {
    throw new Error(`Are.na channel: ${chRes.status} ${chRes.statusText}`);
  }
  const channel = (await chRes.json()) as ArenaV3Channel;

  const raw: ArenaV3Block[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${API}/channels/${CHANNEL_SLUG}/contents`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per", "100");

    const res = await fetch(url.toString(), init);
    if (!res.ok) {
      throw new Error(`Are.na contents: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as {
      data: ArenaV3Block[];
      meta?: { has_more_pages?: boolean };
    };
    const batch = body.data || [];
    raw.push(...batch);
    hasMore = body.meta?.has_more_pages === true && batch.length > 0;
    page++;
  }

  const blocks = raw
    .map(toItem)
    .sort((a, b) => a.position - b.position || a.id - b.id);

  return { channel, blocks };
}
