/**
 * Feature Requests: status from `[bracket]` labels, `Status:` lines, or comment_count fallback.
 * Tag vocabulary for filters is built in feature-request-tags.ts (recurring `[...]` across the channel).
 */

export type FeatureRequestStatusKey = "reviewing" | "progress" | "approved";

export type FeatureRequestStatus = {
  key: FeatureRequestStatusKey;
  label: string;
};

export type FeatureRequestBlockLike = {
  id: number;
  type: string;
  title: string;
  description: string;
  content?: string;
  comment_count: number;
  link?: { title: string; description: string };
};

const LABEL: Record<FeatureRequestStatusKey, string> = {
  reviewing: "Under Review",
  progress: "In Progress",
  approved: "Approved",
};

export function featureRequestStripHtml(html: string): string {
  return html
    .replace(/<\/?(?:p|div|section|article|header|footer|li|ul|ol|h[1-6]|blockquote|pre|br)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** Remove leading `[tag]` groups from titles (keeps readable heading). */
export function featureRequestStripTitleBrackets(title: string): string {
  const t = title.trim().replace(/^(\s*\[[^\]]+\]\s*)+/, "").trim();
  return t || title.trim();
}

export function registerFeatureRequestHandlebarsHelpers(H: {
  registerHelper(name: string, helper: (...args: unknown[]) => unknown): void;
}): void {
  H.registerHelper("featureRequestStatusKey", function (this: FeatureRequestBlockLike) {
    return parseFeatureRequestStatus(this).key;
  });
  H.registerHelper("featureRequestStatusLabel", function (this: FeatureRequestBlockLike) {
    return parseFeatureRequestStatus(this).label;
  });
  H.registerHelper("featureRequestChildHref", function (this: FeatureRequestBlockLike) {
    return `block-${this.id}.html`;
  });
  H.registerHelper("featureRequestCleanDescription", function (this: FeatureRequestBlockLike) {
    return featureRequestCleanDescription(this.description || "");
  });
  H.registerHelper("featureRequestRowExcerpt", function (this: FeatureRequestBlockLike) {
    return featureRequestRowExcerpt(this);
  });
}

/** Map a single bracket's inner text to a status bucket (or null if not a status label). */
export function featureRequestBracketLabelToStatusKey(
  raw: string
): FeatureRequestStatusKey | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s === "under review" || s === "reviewing" || s === "review" || s === "pending" || s === "triage") {
    return "reviewing";
  }
  if (
    s.includes("under") &&
    s.includes("review") &&
    !s.includes("progress")
  ) {
    return "reviewing";
  }
  if (
    s === "in progress" ||
    s === "progress" ||
    s === "working" ||
    s === "active"
  ) {
    return "progress";
  }
  if (s.includes("progress")) {
    return "progress";
  }
  if (
    s === "approved" ||
    s === "done" ||
    s === "shipped" ||
    s === "complete" ||
    s === "completed"
  ) {
    return "approved";
  }
  return null;
}

/** Plain text for status parsing: title first, then description, then body / link text. */
export function featureRequestSearchText(block: FeatureRequestBlockLike): string {
  const parts: string[] = [];
  if (block.title?.trim()) parts.push(block.title.trim());
  if (block.description?.trim()) parts.push(block.description.trim());
  if (block.type === "text" && block.content?.trim()) {
    parts.push(featureRequestStripHtml(block.content));
  }
  if (block.type === "link" && block.link) {
    if (block.link.title?.trim()) parts.push(block.link.title.trim());
    if (block.link.description?.trim()) parts.push(block.link.description.trim());
  }
  return parts.join("\n\n");
}

function extractStatusKeyFromBrackets(text: string): FeatureRequestStatusKey | null {
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1].trim();
    const special = /^\s*status\s*:\s*(.+)$/i.exec(inner);
    if (special?.[1]) {
      const k = featureRequestBracketLabelToStatusKey(special[1]);
      if (k) return k;
      continue;
    }
    const k = featureRequestBracketLabelToStatusKey(inner);
    if (k) return k;
  }
  return null;
}

function extractStatusFromLegacyLines(text: string): FeatureRequestStatusKey | null {
  const bracket = text.match(/\[status:\s*([^\]]+)\]/i);
  if (bracket?.[1]) {
    const k = featureRequestBracketLabelToStatusKey(bracket[1]);
    if (k) return k;
  }
  const lines = text.split(/\r?\n/);
  for (const line of lines.slice(0, 12)) {
    const m = /^\s*status\s*:\s*(.+)$/i.exec(line);
    if (m?.[1]) {
      const k = featureRequestBracketLabelToStatusKey(m[1]);
      if (k) return k;
    }
  }
  return null;
}

function fallbackFromComments(commentCount: number): FeatureRequestStatusKey {
  if (commentCount === 0) return "reviewing";
  if (commentCount > 14) return "approved";
  return "progress";
}

export function parseFeatureRequestStatus(block: FeatureRequestBlockLike): FeatureRequestStatus {
  const text = featureRequestSearchText(block);
  const fromBrackets = extractStatusKeyFromBrackets(text);
  const fromLegacy = extractStatusFromLegacyLines(text);
  const key = fromBrackets ?? fromLegacy ?? fallbackFromComments(block.comment_count ?? 0);
  return { key, label: LABEL[key] };
}

/** Strip metadata and all `[bracket]` segments from a description field. */
export function featureRequestCleanDescription(description: string): string {
  let s = description.replace(/\[status:\s*[^\]]+\]/gi, "").trim();
  s = s.replace(/^\s*status\s*:\s*[^\n]+\n?/im, "").trim();
  s = s.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
  return s;
}

/** Short plain line for the registry row (status / bracket metadata stripped). */
export function featureRequestRowExcerpt(block: FeatureRequestBlockLike, maxLen = 220): string {
  let d = featureRequestCleanDescription(block.description || "");
  if (!d.trim() && block.type === "text" && block.content) {
    let plain = featureRequestStripHtml(block.content);
    plain = plain.replace(/^\s*status\s*:\s*[^\n]+/i, "").trim();
    plain = plain.replace(/\[status:\s*[^\]]+\]/gi, "").trim();
    plain = plain.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
    d = plain;
  }
  d = d.trim();
  if (!d) return "";
  if (d.length <= maxLen) return d;
  return `${d.slice(0, maxLen - 1).trimEnd()}…`;
}
