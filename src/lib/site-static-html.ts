/** Filenames emitted for Directory template static builds (sibling to index.html). */
const ALLOWED_SITE_HTML = /^(index\.html|block-\d+\.html)$/;

/**
 * Resolve HTML filename from the visitor path on the wildcard host (e.g. `/`, `/block-7.html`).
 * Used when middleware forwards `x-tiny-garden-site-path` because `nextUrl.pathname` in the
 * handler may still reflect the public URL (`/`) after a rewrite.
 */
export function filenameFromVisitorPath(visitorPath: string): string | null {
  const p = visitorPath.trim() || "/";
  if (p === "/" || p === "") return "index.html";
  const name = p.replace(/^\//, "").split("/")[0] || "";
  if (!name) return "index.html";
  if (!ALLOWED_SITE_HTML.test(name)) return null;
  return name;
}

/**
 * Resolve a safe HTML filename from a serve API path (e.g. /api/serve/foo/block-7.html).
 * Returns null if the path is not an allowed static file.
 */
export function filenameFromServePath(pathname: string, servePrefix: string): string | null {
  if (!pathname.startsWith(servePrefix)) return null;
  const rel = pathname.slice(servePrefix.length);
  if (!rel || rel === "/") return "index.html";
  const name = rel.replace(/^\//, "").split("/")[0] || "";
  if (!ALLOWED_SITE_HTML.test(name)) return null;
  return name;
}

/**
 * Given the blob URL for index.html, return the URL for another file in the same folder.
 */
export function blobUrlForSiblingSiteFile(indexBlobUrl: string, filename: string): string {
  const u = new URL(indexBlobUrl);
  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    u.pathname = `/${filename}`;
    return u.toString();
  }
  segments[segments.length - 1] = filename;
  u.pathname = `/${segments.join("/")}`;
  return u.toString();
}
