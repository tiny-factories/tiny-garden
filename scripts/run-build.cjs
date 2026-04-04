"use strict";

const { spawnSync } = require("child_process");
const {
  loadDotenv,
  ensureDirectUrlForGenerate,
  getMigrateEnv,
} = require("./prisma-db-env.cjs");
const { prismaCliPath } = require("./prisma-cli.cjs");

loadDotenv();

const BASELINE_MIGRATION = "20260404_cli_foundation";

function runNode(args, env) {
  const r = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: env || process.env,
  });
  if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);
}

function runPrismaCapture(args, env) {
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: env || process.env,
  });
}

const prisma = prismaCliPath();
const nextBin = require.resolve("next/dist/bin/next");

function migrateDeploy() {
  const migrateEnv = getMigrateEnv();
  const r = runPrismaCapture([prisma, "migrate", "deploy"], migrateEnv);
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status === 0) return;

  const combined = `${r.stdout || ""}${r.stderr || ""}`;
  const isP3005 = combined.includes("P3005");

  if (!isP3005) {
    process.exit(r.status === null ? 1 : r.status);
  }

  if (process.env.PRISMA_AUTO_BASELINE_ON_P3005 !== "1") {
    process.stderr.write(`
Prisma P3005: database has data but no Prisma migration history.

1) Apply schema to the DB first (Neon SQL editor, same DB as DATABASE_URL), e.g.:
     prisma/manual-fix-discoverable.sql
   and/or the full:
     prisma/migrations/${BASELINE_MIGRATION}/migration.sql

2) Then record the migration without re-running SQL:
     yarn db:baseline

Optional (dangerous): set PRISMA_AUTO_BASELINE_ON_P3005=1 for one build to mark the migration
applied without running SQL — only if the DB already matches that migration.
`);
    process.exit(r.status === null ? 1 : r.status);
  }

  process.stderr.write(
    `\n[prisma] P3005: PRISMA_AUTO_BASELINE_ON_P3005=1 — marking ${BASELINE_MIGRATION} applied, then retrying deploy…\n\n`
  );

  const resolved = runPrismaCapture(
    [prisma, "migrate", "resolve", "--applied", BASELINE_MIGRATION],
    migrateEnv
  );
  if (resolved.stdout) process.stdout.write(resolved.stdout);
  if (resolved.stderr) process.stderr.write(resolved.stderr);
  if (resolved.status !== 0) {
    process.exit(resolved.status === null ? 1 : resolved.status);
  }

  const again = runPrismaCapture([prisma, "migrate", "deploy"], migrateEnv);
  if (again.stdout) process.stdout.write(again.stdout);
  if (again.stderr) process.stderr.write(again.stderr);
  if (again.status !== 0) {
    process.stderr.write(`
[prisma] migrate deploy still failed after baseline. Apply SQL from prisma/migrations/${BASELINE_MIGRATION}/migration.sql first.
`);
    process.exit(again.status === null ? 1 : again.status);
  }
}

migrateDeploy();
ensureDirectUrlForGenerate();
runNode([prisma, "generate"]);
runNode([nextBin, "build"]);
