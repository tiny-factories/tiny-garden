"use strict";

const { existsSync } = require("fs");
const { resolve } = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");
const { prismaCliPath } = require("./prisma-cli.cjs");

dotenv.config({ path: resolve(".env") });
if (existsSync(resolve(".env.local"))) {
  dotenv.config({ path: resolve(".env.local"), override: true });
}

const args = process.argv.slice(2);
const r = spawnSync(process.execPath, [prismaCliPath(), ...args], {
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status === null ? 1 : r.status);
