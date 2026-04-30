-- Idempotent repair: BuildRequest (see prisma/migrations/20260404_cli_foundation/migration.sql).
-- Run: yarn db:ensure-build-request

CREATE TABLE IF NOT EXISTS "BuildRequest" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BuildRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BuildRequest_userId_createdAt_idx" ON "BuildRequest"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "BuildRequest_siteId_createdAt_idx" ON "BuildRequest"("siteId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BuildRequest_siteId_fkey'
  ) THEN
    ALTER TABLE "BuildRequest"
    ADD CONSTRAINT "BuildRequest_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "Site"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'BuildRequest_userId_fkey'
  ) THEN
    ALTER TABLE "BuildRequest"
    ADD CONSTRAINT "BuildRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
