"use strict";

/** Resolved Prisma CLI entry (avoids `npx` + Yarn on Vercel → spurious npm config warnings). */
function prismaCliPath() {
  return require.resolve("prisma/build/index.js");
}

module.exports = { prismaCliPath };
