-- Run in Neon (or any Postgres) against the SAME database as Vercel DATABASE_URL.
-- Fixes: P2022 The column Site.discoverable does not exist
ALTER TABLE "Site"
ADD COLUMN IF NOT EXISTS "discoverable" BOOLEAN NOT NULL DEFAULT true;

-- If you also need CLI tables (tokens / build limits), run the full file:
--   prisma/migrations/20260404_cli_foundation/migration.sql
--
-- After this column exists and you want per-site opt-out from public search, add back to schema.prisma:
--   discoverable Boolean @default(true)
-- on model Site, and in src/app/api/sites/search/route.ts public scope use where: { published: true, discoverable: true }.
