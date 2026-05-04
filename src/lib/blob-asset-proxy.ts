const VERCEL_BLOB_HOST = "blob.vercel-storage.com";

export function isAllowedBlobAssetUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  return hostname === VERCEL_BLOB_HOST || hostname.endsWith(`.${VERCEL_BLOB_HOST}`);
}
