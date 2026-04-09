import { describe, expect, it } from "vitest";
import {
  decryptSessionPayload,
  encryptSessionPayload,
  getSessionSecret,
} from "@/lib/session-crypto";

describe("session-crypto", () => {
  it("round-trips payload with AES-GCM", () => {
    const secret = "test-secret";
    const plain = JSON.stringify({ userId: "u_1" });
    const encrypted = encryptSessionPayload(plain, secret, "test");
    const decrypted = decryptSessionPayload(encrypted, secret, "test");
    expect(decrypted).toBe(plain);
  });

  it("rejects tampered ciphertext", () => {
    const secret = "test-secret";
    const plain = "hello";
    const encrypted = encryptSessionPayload(plain, secret, "test");
    const tampered = encrypted.slice(0, -1) + (encrypted.endsWith("0") ? "1" : "0");
    expect(() => decryptSessionPayload(tampered, secret, "test")).toThrow();
  });

  it("supports legacy CBC payload decryption for existing sessions", () => {
    const secret = "legacy-secret";
    const crypto = require("crypto") as typeof import("crypto");
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash("sha256").update(secret).digest();
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update("legacy", "utf8", "hex");
    encrypted += cipher.final("hex");
    const legacyPayload = `${iv.toString("hex")}:${encrypted}`;
    expect(decryptSessionPayload(legacyPayload, secret, "test")).toBe("legacy");
  });

  it("throws in production if SESSION_SECRET missing", () => {
    expect(() => getSessionSecret(undefined, "production")).toThrow(
      "SESSION_SECRET is required in production"
    );
  });

  it("uses dev fallback secret outside production", () => {
    expect(getSessionSecret(undefined, "development")).toBe("dev-secret-change-me");
  });
});
