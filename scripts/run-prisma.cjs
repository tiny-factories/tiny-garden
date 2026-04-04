"use strict";

const { spawnSync } = require("child_process");
const {
  loadDotenv,
  ensureDirectUrlForGenerate,
  getMigrateEnv,
} = require("./prisma-db-env.cjs");
const { prismaCliPath } = require("./prisma-cli.cjs");

loadDotenv();

const args = process.argv.slice(2);

function commandNeedsDirectPostgres(args) {
  const [a, b] = args;
  if (a === "migrate") return true;
  if (a === "db" && (b === "push" || b === "execute" || b === "pull"))
    return true;
  return false;
}

let env;
if (commandNeedsDirectPostgres(args)) {
  env = getMigrateEnv();
} else {
  ensureDirectUrlForGenerate();
  env = process.env;
}

const r = spawnSync(process.execPath, [prismaCliPath(), ...args], {
  stdio: "inherit",
  env,
});
process.exit(r.status === null ? 1 : r.status);
