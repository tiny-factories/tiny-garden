import net from "net";

const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ASSET_BYTES = 25 * 1024 * 1024; // 25MB
const DEFAULT_MAX_REDIRECTS = 3;

function isPrivateIPv4(host: string): boolean {
  const parts = host.split(".").map((x) => Number(x));
  if (parts.length !== 4 || parts.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // RFC6598 CGNAT
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) return isPrivateIPv4(host);
  if (ipVersion === 6) return isPrivateIPv6(host);
  return false;
}

export function isAllowedRemoteAssetUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (isBlockedHostname(url.hostname)) return false;
  return true;
}

function parseAssetUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

async function readResponseWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    const fallback = Buffer.from(await response.arrayBuffer());
    if (fallback.length > maxBytes) {
      throw new Error(`Asset exceeds max size (${maxBytes} bytes)`);
    }
    return fallback;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      throw new Error(`Asset exceeds max size (${maxBytes} bytes)`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function withTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

interface FetchRemoteAssetOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
}

export async function fetchRemoteAsset(
  inputUrl: string,
  options: FetchRemoteAssetOptions = {}
): Promise<{ finalUrl: string; contentType: string; buffer: Buffer }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_ASSET_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const fetchImpl = options.fetchImpl ?? fetch;

  const startUrl = parseAssetUrl(inputUrl);
  if (!startUrl || !isAllowedRemoteAssetUrl(startUrl)) {
    throw new Error("Blocked asset URL");
  }

  let current = startUrl;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const { signal, cleanup } = withTimeoutSignal(timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(current.toString(), {
        redirect: "manual",
        signal,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"))
      ) {
        throw new Error(`Asset fetch timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      cleanup();
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect missing location header");
      if (redirectCount === maxRedirects) {
        throw new Error("Too many redirects");
      }
      const redirected = new URL(location, current);
      if (!isAllowedRemoteAssetUrl(redirected)) {
        throw new Error("Blocked redirect URL");
      }
      current = redirected;
      continue;
    }

    if (!res.ok) throw new Error(`Remote asset fetch failed: ${res.status}`);

    const contentLengthRaw = res.headers.get("content-length");
    if (contentLengthRaw) {
      const contentLength = Number(contentLengthRaw);
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new Error(`Asset exceeds max size (${maxBytes} bytes)`);
      }
    }

    const buffer = await readResponseWithLimit(res, maxBytes);
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    return {
      finalUrl: res.url || current.toString(),
      contentType,
      buffer,
    };
  }

  throw new Error("Too many redirects");
}

