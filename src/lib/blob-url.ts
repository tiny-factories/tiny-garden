const ALLOWED_BLOB_HOSTS = new Set([
  "blob.vercel-storage.com",
]);

const ALLOWED_BLOB_SUFFIXES = [
  ".public.blob.vercel-storage.com",
];

function hasAllowedBlobHost(hostname: string): boolean {
  if (ALLOWED_BLOB_HOSTS.has(hostname)) return true;
  return ALLOWED_BLOB_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export function validateBlobUrl(input: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (!hasAllowedBlobHost(parsed.hostname.toLowerCase())) return null;
  return parsed;
}

export const parseAndValidateBlobUrl = validateBlobUrl;
