"use strict";

const { existsSync } = require("fs");
const { resolve } = require("path");
const dotenv = require("dotenv");

function loadDotenv() {
  dotenv.config({ path: resolve(".env") });
  if (existsSync(resolve(".env.local"))) {
    dotenv.config({ path: resolve(".env.local"), override: true });
  }
}

/** True when URL likely goes through PgBouncer / Neon pooler (migrate locks fail → P1002). */
function looksLikePoolerUrl(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.toLowerCase();
  return (
    u.includes("-pooler.") ||
    u.includes("pgbouncer=true") ||
    (u.includes("neon.tech") && u.includes("pooler"))
  );
}

/**
 * Neon pooled hosts use `-pooler.` in the hostname; direct is the same URL with that segment removed.
 * Same user, password, db, params — only the host changes.
 */
function tryNeonDirectUrlFromPooled(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname;
    if (!host.includes("neon.tech") || !host.includes("-pooler")) {
      return null;
    }
    const directHost = host.replace(/-pooler\./g, ".");
    if (directHost === host) return null;
    url.hostname = directHost;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Prisma schema requires DIRECT_URL; `generate` does not need a real direct connection.
 * Duplicate pooled URL is fine here.
 */
function ensureDirectUrlForGenerate() {
  const db = process.env.DATABASE_URL;
  if (!process.env.DIRECT_URL && db) {
    process.env.DIRECT_URL = db;
  }
}

/**
 * Env for `prisma migrate` / `db push`: must use a non-pooled URL when DATABASE_URL is pooled.
 */
function getMigrateEnv() {
  const base = { ...process.env };
  const db = process.env.DATABASE_URL || "";
  const direct = process.env.DIRECT_URL || "";

  if (!db) {
    base.DIRECT_URL = direct || db;
    return base;
  }

  if (looksLikePoolerUrl(db)) {
    let effectiveDirect = direct;
    if (!effectiveDirect || looksLikePoolerUrl(effectiveDirect)) {
      const derived = tryNeonDirectUrlFromPooled(db);
      if (derived && !looksLikePoolerUrl(derived)) {
        effectiveDirect = derived;
        if (process.env.VERCEL === "1") {
          console.error(
            "[prisma] DIRECT_URL not set: using direct host derived from Neon pooled DATABASE_URL for migrate deploy.\n"
          );
        }
      }
    }
    if (!effectiveDirect || looksLikePoolerUrl(effectiveDirect)) {
      console.error(`
[prisma] DATABASE_URL points at a pooler. Prisma Migrate needs a non-pooled Postgres URL (P1002).

For Neon: set DIRECT_URL to the "Direct connection" string, or use a pooled DATABASE_URL whose host contains "-pooler." so we can derive the direct host.

https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#direct-url
`);
      process.exit(1);
    }
    base.DIRECT_URL = effectiveDirect;
    return base;
  }

  base.DIRECT_URL = direct || db;
  return base;
}

module.exports = {
  loadDotenv,
  looksLikePoolerUrl,
  tryNeonDirectUrlFromPooled,
  ensureDirectUrlForGenerate,
  getMigrateEnv,
};
