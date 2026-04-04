"use strict";

const { existsSync } = require("fs");
const { resolve } = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");
const { prismaCliPath } = require("./prisma-cli.cjs");

// Prisma CLI only reads `.env` by default; Next.js uses `.env.local` — load both.
dotenv.config({ path: resolve(".env") });
if (existsSync(resolve(".env.local"))) {
  dotenv.config({ path: resolve(".env.local"), override: true });
}

const BASELINE_MIGRATION = "20260404_cli_foundation";

function runNode(args) {
  const r = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);
}

function runPrismaCapture(args) {
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: process.env,
  });
}

const prisma = prismaCliPath();
const nextBin = require.resolve("next/dist/bin/next");

function migrateDeploy() {
  const r = runPrismaCapture([prisma, "migrate", "deploy"]);
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status === 0) return;

  const combined = `${r.stdout || ""}${r.stderr || ""}`;
  const isP3005 = combined.includes("P3005");

  if (
    isP3005 &&
    process.env.PRISMA_BASELINE_ON_P3005 === "1"
  ) {
    process.stderr.write(
      `\n[prisma] P3005: marking ${BASELINE_MIGRATION} as applied (PRISMA_BASELINE_ON_P3005=1), then retrying deploy…\n\n`
    );
    runNode([prisma, "migrate", "resolve", "--applied", BASELINE_MIGRATION]);
    runNode([prisma, "migrate", "deploy"]);
    return;
  }

  if (isP3005) {
    process.stderr.write(`
Prisma P3005: this database already has tables but no Prisma migration history.

Fix once (same DATABASE_URL as this build):

  yarn db:baseline
  # or: npm run db:baseline

If "Site"."discoverable", "ApiToken", or "BuildRequest" are missing, run the SQL in
  prisma/migrations/${BASELINE_MIGRATION}/migration.sql
in the Neon console first, then run db:baseline again.

One-shot on Vercel: add env PRISMA_BASELINE_ON_P3005=1 for a single deploy, then remove it.
`);
  }

  process.exit(r.status === null ? 1 : r.status);
}

migrateDeploy();
runNode([prisma, "generate"]);
runNode([nextBin, "build"]);
