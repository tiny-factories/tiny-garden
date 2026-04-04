import crypto from "crypto";

export const SESSION_COOKIE_NAME = "session";
const DEV_FALLBACK_SECRET = "dev-secret-change-me";
const SESSION_VERSION = "v1";

export function getSessionSecret(
  sessionSecret = process.env.SESSION_SECRET,
  nodeEnv = process.env.NODE_ENV
): string {
  if (sessionSecret) return sessionSecret;
  if (nodeEnv === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return DEV_FALLBACK_SECRET;
}

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function decryptLegacyCbc(payload: string, secret: string): string {
  const [ivHex, encrypted] = payload.split(":");
  if (!ivHex || !encrypted) {
    throw new Error("Invalid legacy session payload");
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", deriveKey(secret), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export interface SessionPayload {
  userId: string;
  arenaToken: string;
  arenaUserId: number;
  arenaUsername: string;
}

export function encryptSessionPayload(
  data: string,
  sessionSecret = process.env.SESSION_SECRET,
  nodeEnv = process.env.NODE_ENV
): string {
  const secret = getSessionSecret(sessionSecret, nodeEnv);
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${SESSION_VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptSessionPayload(
  payload: string,
  sessionSecret = process.env.SESSION_SECRET,
  nodeEnv = process.env.NODE_ENV
): string {
  const secret = getSessionSecret(sessionSecret, nodeEnv);
  const parts = payload.split(":");

  if (parts.length === 2) {
    return decryptLegacyCbc(payload, secret);
  }

  if (parts.length !== 4 || parts[0] !== SESSION_VERSION) {
    throw new Error("Invalid session payload");
  }

  const [, ivHex, tagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.userId === "string" &&
    typeof payload.arenaToken === "string" &&
    typeof payload.arenaUserId === "number" &&
    typeof payload.arenaUsername === "string"
  );
}

/** Parse encrypted session cookie value (used by API routes and Node middleware). */
export function parseSessionCookie(
  raw: string | undefined | null
): SessionPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decryptSessionPayload(raw));
    return isSessionPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
