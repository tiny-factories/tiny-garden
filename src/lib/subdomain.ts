const SITE_SUBDOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const RESERVED_SITE_SUBDOMAINS = new Set(["www"]);

export function normalizeSiteSubdomain(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const subdomain = value.trim().toLowerCase();
  if (!SITE_SUBDOMAIN.test(subdomain)) return null;
  if (RESERVED_SITE_SUBDOMAINS.has(subdomain)) return null;

  return subdomain;
}
