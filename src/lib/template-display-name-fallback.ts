/** Title-case fallback when meta.json name is unavailable (safe for client bundles). */
export function templateDisplayNameFallback(slug: string): string {
  if (!slug) return "Template";
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
