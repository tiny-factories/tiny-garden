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

  if (!isP3005) {
    process.exit(r.status === null ? 1 : r.status);
  }

  if (process.env.PRISMA_NO_AUTO_BASELINE === "1") {
    process.stderr.write(`
Prisma P3005: existing DB, no migration history. Auto-baseline is disabled (PRISMA_NO_AUTO_BASELINE=1).

  yarn db:baseline

If "Site"."discoverable", "ApiToken", or "BuildRequest" are missing, run
  prisma/migrations/${BASELINE_MIGRATION}/migration.sql
in Neon first, then yarn db:baseline.
`);
    process.exit(r.status === null ? 1 : r.status);
  }

  process.stderr.write(
    `\n[prisma] P3005: baselining migration ${BASELINE_MIGRATION}, then retrying migrate deploy…\n\n`
  );

  const resolved = runPrismaCapture([
    prisma,
    "migrate",
    "resolve",
    "--applied",
    BASELINE_MIGRATION,
  ]);
  if (resolved.stdout) process.stdout.write(resolved.stdout);
  if (resolved.stderr) process.stderr.write(resolved.stderr);
  if (resolved.status !== 0) {
    process.exit(resolved.status === null ? 1 : resolved.status);
  }

  const again = runPrismaCapture([prisma, "migrate", "deploy"]);
  if (again.stdout) process.stdout.write(again.stdout);
  if (again.stderr) process.stderr.write(again.stderr);
  if (again.status !== 0) {
    process.stderr.write(`
[prisma] migrate deploy still failed after baseline. If schema is missing this migration's changes, run
  prisma/migrations/${BASELINE_MIGRATION}/migration.sql
in your SQL editor, then run: yarn build
`);
    process.exit(again.status === null ? 1 : again.status);
  }
}

migrateDeploy();
runNode([prisma, "generate"]);
runNode([nextBin, "build"]);
