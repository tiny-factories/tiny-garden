-- Add discoverability for public search.
ALTER TABLE "Site"
ADD COLUMN IF NOT EXISTS "discoverable" BOOLEAN NOT NULL DEFAULT true;

-- API tokens for CLI auth.
CREATE TABLE IF NOT EXISTS "ApiToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "scopes" TEXT NOT NULL DEFAULT 'all',
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "ApiToken_userId_revokedAt_idx" ON "ApiToken"("userId", "revokedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ApiToken_userId_fkey'
  ) THEN
    ALTER TABLE "ApiToken"
    ADD CONSTRAINT "ApiToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Build request accounting for cooldowns/quotas.
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
