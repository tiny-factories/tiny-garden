"use strict";

const { spawnSync } = require("child_process");
const {
  loadDotenv,
  ensureDirectUrlForGenerate,
} = require("./prisma-db-env.cjs");
const { prismaCliPath } = require("./prisma-cli.cjs");

loadDotenv();
ensureDirectUrlForGenerate();

const r = spawnSync(process.execPath, [prismaCliPath(), "generate"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status === null ? 1 : r.status);
