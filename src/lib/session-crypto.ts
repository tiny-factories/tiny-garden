import crypto from "crypto";

export const SESSION_COOKIE_NAME = "session";

export interface SessionPayload {
  userId: string;
  arenaToken: string;
  arenaUserId: number;
  arenaUsername: string;
}

/**
 * Resolve the session secret lazily (never at module load, so the build does
 * not fail when the env is absent). Requires a real, sufficiently long secret —
 * there is intentionally no insecure fallback, because a predictable secret
 * makes every session forgeable.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters (generate with `openssl rand -hex 32`)."
    );
  }
  return secret;
}

function key() {
  return crypto.createHash("sha256").update(getSecret()).digest();
}

export function encryptSessionPayload(json: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // iv:authTag:ciphertext — the auth tag makes the cookie tamper-evident.
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString(
    "hex"
  )}`;
}

function decryptSessionPayload(data: string): string {
  const parts = data.split(":");
  if (parts.length !== 3) {
    // Reject any cookie that is not in the authenticated format (including the
    // legacy unauthenticated AES-CBC `iv:ciphertext` form).
    throw new Error("Malformed session cookie");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Parse encrypted session cookie value (used by API routes and Node middleware). */
export function parseSessionCookie(
  raw: string | undefined | null
): SessionPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(decryptSessionPayload(raw)) as SessionPayload;
  } catch {
    return null;
  }
}
