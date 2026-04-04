# AGENTS.md

## Cursor Cloud specific instructions

### Services

| Service | How to start | Notes |
|---------|-------------|-------|
| **PostgreSQL** | `sudo pg_ctlcluster 16 main start` | Must be running before the dev server. Local DB: `postgresql://tinygarden:tinygarden@localhost:5432/tinygarden` |
| **Next.js dev server** | `npx next dev --port 3000` | Use `npx next dev` instead of `npm run dev` to skip the `predev` script which calls an external API. The `--experimental-https` flag in `npm run dev` requires `mkcert`; omit it for plain HTTP. |

### Quick reference

- **Lint:** `npm run lint`
- **Build:** `npm run build`
- **Prisma push:** `DATABASE_URL="postgresql://tinygarden:tinygarden@localhost:5432/tinygarden" npx prisma db push`
- **Prisma studio:** `DATABASE_URL="postgresql://tinygarden:tinygarden@localhost:5432/tinygarden" npx prisma studio`

### Gotchas

- The `npm run dev` script includes a `predev` hook that calls `scripts/sync-feature-requests.mjs` (fetches from an external Are.na channel). It fails silently but adds startup latency. Use `npx next dev --port 3000` directly to skip it.
- The Prisma schema uses PostgreSQL (not SQLite). `CLAUDE.md` mentions SQLite commands for `prisma db push` / `prisma studio` with `DATABASE_URL="file:./dev.db"` — those are outdated. Use the PostgreSQL URL above.
- Are.na OAuth credentials (`ARENA_CLIENT_ID`, `ARENA_CLIENT_SECRET`) are required to test login/dashboard flows. Without them the app boots and serves public pages (homepage, `/templates`, `/docs`, `/login`) but OAuth redirects will fail.
- Stripe keys are optional; billing endpoints return 503 gracefully when unconfigured.
- `BLOB_READ_WRITE_TOKEN` is optional; without it, built sites fall back to local `generated/` directory.
- `.env.local` must include `DATABASE_URL` pointing to the running PostgreSQL instance.
