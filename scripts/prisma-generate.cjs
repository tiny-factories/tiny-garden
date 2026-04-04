"use strict";

const { existsSync } = require("fs");
const { resolve } = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");

dotenv.config({ path: resolve(".env") });
if (existsSync(resolve(".env.local"))) {
  dotenv.config({ path: resolve(".env.local"), override: true });
}

const r = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(r.status === null ? 1 : r.status);
