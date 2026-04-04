"use strict";

const { spawnSync, execSync } = require("child_process");
const {
  loadDotenv,
  ensureDirectUrlForGenerate,
  getMigrateEnv,
  looksLikePoolerUrl,
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

function sleepSync(ms) {
  if (process.platform !== "win32") {
    try {
      const s = Math.max(1, Math.ceil(ms / 1000));
      execSync(`sleep ${s}`, { stdio: "ignore" });
      return;
    } catch {
      /* fall through */
    }
  }
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* busy wait */
  }
}

function migrateDeploy() {
  const migrateEnv = getMigrateEnv();
  const maxAttempts = Math.min(
    8,
    Math.max(1, parseInt(process.env.PRISMA_MIGRATE_DEPLOY_ATTEMPTS || "5", 10))
  );
  const p1002BaseWaitMs = parseInt(
    process.env.PRISMA_MIGRATE_P1002_WAIT_MS || "12000",
    10
  );

  let r = { status: 1, stdout: "", stderr: "" };
  let combined = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    r = runPrismaCapture([prisma, "migrate", "deploy"], migrateEnv);
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    combined = `${r.stdout || ""}${r.stderr || ""}`;
    if (r.status === 0) return;

    const isP1002 = combined.includes("P1002");
    if (isP1002 && attempt < maxAttempts) {
      const waitMs = p1002BaseWaitMs + (attempt - 1) * 5000;
      process.stderr.write(
        `[prisma] P1002 (advisory lock timeout) — retrying migrate deploy (${attempt + 1}/${maxAttempts}) in ${Math.round(waitMs / 1000)}s (concurrent deploys / Neon wake).\n`
      );
      sleepSync(waitMs);
      continue;
    }
    break;
  }

  if (r.status === 0) return;

  const isP3005 = combined.includes("P3005");

  if (!isP3005) {
    if (combined.includes("P1002")) {
      process.stderr.write(
        `[prisma] Still P1002 after ${maxAttempts} attempts. Cancel overlapping Vercel builds or run: yarn db:migrate with DIRECT_URL when the DB is quiet.\n`
      );
    }
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

const dbUrl = process.env.DATABASE_URL || "";
const inCI = process.env.CI === "true" || process.env.CI === "1";
const localPooledWithoutDirect =
  process.env.VERCEL !== "1" &&
  !inCI &&
  looksLikePoolerUrl(dbUrl) &&
  !process.env.DIRECT_URL;

if (process.env.PRISMA_SKIP_MIGRATE_DEPLOY === "1") {
  process.stderr.write(
    "[prisma] Skipping migrate deploy (PRISMA_SKIP_MIGRATE_DEPLOY=1). Do not set this on Vercel.\n"
  );
} else if (localPooledWithoutDirect) {
  process.stderr.write(
    "[prisma] Skipping migrate deploy (local build: pooled DATABASE_URL, no DIRECT_URL).\n" +
      "Add DIRECT_URL from Neon → Connect → Direct connection to run migrations locally, or rely on Vercel (set DIRECT_URL there).\n"
  );
} else {
  migrateDeploy();
}
ensureDirectUrlForGenerate();
runNode([prisma, "generate"]);
runNode([nextBin, "build"]);
