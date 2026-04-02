#!/usr/bin/env node
/**
 * Pulls public blocks from the tiny.garden feature-requests channel and writes docs/feature-reviews.md.
 * Run from repo root: node scripts/sync-feature-requests.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outFile = path.join(root, "docs", "feature-reviews.md");

const CHANNEL_SLUG = "tiny-garden-feature-requests";
const ARENA_URL = "https://www.are.na/tiny-factories/tiny-garden-feature-requests";
const API = "https://api.are.na/v3";

function blockSummary(b) {
  const c = b.content;
  const plain =
    (c && typeof c === "object" && c.plain) ||
    (c && typeof c === "object" && c.markdown) ||
    "";
  const desc = (b.description && String(b.description).trim()) || "";
  const title = b.title ? String(b.title).trim() : "";
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

function toItem(b) {
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

async function main() {
  const init = { headers: { Accept: "application/json" } };

  const chRes = await fetch(`${API}/channels/${CHANNEL_SLUG}`, init);
  if (!chRes.ok) throw new Error(`channel ${chRes.status}`);
  const channel = await chRes.json();

  const raw = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const url = new URL(`${API}/channels/${CHANNEL_SLUG}/contents`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per", "100");
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`contents ${res.status}`);
    const body = await res.json();
    const batch = body.data || [];
    raw.push(...batch);
    hasMore = body.meta?.has_more_pages === true && batch.length > 0;
    page++;
  }

  const blocks = raw
    .map(toItem)
    .sort((a, b) => a.position - b.position || a.id - b.id);

  const syncedAtIso = new Date().toISOString();

  const lines = [
    "# Feature reviews",
    "",
    `Source: [${channel.title}](${ARENA_URL})`,
    "",
    `- **Channel slug:** \`${channel.slug}\``,
    `- **Channel updated (Are.na):** ${channel.updated_at}`,
    `- **Markdown synced:** ${syncedAtIso}`,
    `- **Block count:** ${blocks.length}`,
    "",
    "Comments on each block on Are.na are treated as support / votes for that request.",
    "",
    "## Requests (channel order)",
    "",
  ];

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const heading =
      (b.title && b.title.trim()) ||
      b.summary.split("\n")[0]?.slice(0, 120) ||
      `Block ${b.id}`;
    const safeHeading = heading.replace(/\]/g, "\\]");
    lines.push(`### ${i + 1}. [${safeHeading}](${b.blockUrl})`);
    lines.push("");
    lines.push(`- **Type:** ${b.type}`);
    lines.push(`- **Comments:** ${b.commentCount}`);
    lines.push(`- **Added:** ${b.createdAt}`);
    lines.push("");
    const body = b.summary.trim();
    if (body) {
      for (const para of body.split(/\n\n+/)) {
        lines.push(para.split("\n").join("  \n"));
        lines.push("");
      }
    }
    lines.push("---");
    lines.push("");
  }

  const md = lines.join("\n").trimEnd() + "\n";
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, md, "utf8");
  console.log(`Wrote ${blocks.length} blocks to ${path.relative(root, outFile)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
