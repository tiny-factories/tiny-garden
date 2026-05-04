import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8").replace(
    /\r\n/g,
    "\n"
  );
}

function extractCreateTable(sql: string, tableName: string) {
  const start = sql.indexOf(`CREATE TABLE IF NOT EXISTS "${tableName}"`);
  assert.notEqual(start, -1, `${tableName} create table statement exists`);

  const end = sql.indexOf("\n);", start);
  assert.notEqual(end, -1, `${tableName} create table statement terminates`);

  return sql.slice(start, end + "\n);".length);
}

function extractIndex(sql: string, indexName: string) {
  const match = sql.match(
    new RegExp(
      `CREATE INDEX IF NOT EXISTS "${indexName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}"[^;]*;`
    )
  );
  assert.ok(match, `${indexName} index statement exists`);
  return match[0];
}

function extractConstraintBlock(sql: string, constraintName: string) {
  const constraintAt = sql.indexOf(`conname = '${constraintName}'`);
  assert.notEqual(constraintAt, -1, `${constraintName} constraint guard exists`);

  const start = sql.lastIndexOf("DO $$", constraintAt);
  assert.notEqual(start, -1, `${constraintName} DO block starts`);

  const end = sql.indexOf("END $$;", constraintAt);
  assert.notEqual(end, -1, `${constraintName} DO block terminates`);

  return sql.slice(start, end + "END $$;".length);
}

describe("BuildRequest repair SQL", () => {
  it("stays in sync with the canonical migration DDL", () => {
    const migrationSql = readRepoFile(
      "prisma/migrations/20260404_cli_foundation/migration.sql"
    );
    const repairSql = readRepoFile(
      "prisma/manual/ensure-build-request-table.sql"
    );

    assert.equal(
      extractCreateTable(repairSql, "BuildRequest"),
      extractCreateTable(migrationSql, "BuildRequest")
    );

    for (const indexName of [
      "BuildRequest_userId_createdAt_idx",
      "BuildRequest_siteId_createdAt_idx",
    ]) {
      assert.equal(
        extractIndex(repairSql, indexName),
        extractIndex(migrationSql, indexName)
      );
    }

    for (const constraintName of [
      "BuildRequest_siteId_fkey",
      "BuildRequest_userId_fkey",
    ]) {
      assert.equal(
        extractConstraintBlock(repairSql, constraintName),
        extractConstraintBlock(migrationSql, constraintName)
      );
    }
  });

  it("exposes an npm repair command wired to the manual SQL and Prisma schema", () => {
    const packageJson = JSON.parse(readRepoFile("package.json")) as {
      scripts?: Record<string, string>;
    };

    assert.equal(
      packageJson.scripts?.["db:ensure-build-request"],
      "node scripts/run-prisma.cjs db execute --file prisma/manual/ensure-build-request-table.sql --schema prisma/schema.prisma"
    );
  });
});
