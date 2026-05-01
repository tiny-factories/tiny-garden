import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

export const SESSION_COOKIE_NAME = "session";

export interface SessionPayload {
  userId: string;
  arenaToken: string;
  arenaUserId: number;
  arenaUsername: string;
}

function key() {
  return crypto.createHash("sha256").update(SECRET).digest();
}

export function encryptSessionPayload(json: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key(), iv);
  let encrypted = cipher.update(json, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptSessionPayload(data: string): string {
  const [ivHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key(), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
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
