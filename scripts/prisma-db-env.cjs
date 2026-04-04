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
    if (!direct || looksLikePoolerUrl(direct)) {
      console.error(`
[prisma] DATABASE_URL points at a pooler (e.g. Neon *-pooler* host). Prisma Migrate cannot take advisory locks through it (P1002).

Add DIRECT_URL to .env.local and Vercel:
  Neon dashboard → your project → Connect → use the "Direct connection" string (host without "-pooler").
Keep DATABASE_URL as the pooled connection for the app.

https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#direct-url
`);
      process.exit(1);
    }
    base.DIRECT_URL = direct;
    return base;
  }

  base.DIRECT_URL = direct || db;
  return base;
}

module.exports = {
  loadDotenv,
  looksLikePoolerUrl,
  ensureDirectUrlForGenerate,
  getMigrateEnv,
};
