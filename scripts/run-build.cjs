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

function runNode(args) {
  const r = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);
}

const prisma = prismaCliPath();
const nextBin = require.resolve("next/dist/bin/next");

runNode([prisma, "migrate", "deploy"]);
runNode([prisma, "generate"]);
runNode([nextBin, "build"]);
