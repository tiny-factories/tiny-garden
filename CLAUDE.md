# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

tiny.garden turns Are.na channels into static websites. Users log in with Are.na OAuth, pick a channel, choose a template, and get a site hosted on a wildcard subdomain (e.g., `my-channel.tiny.garden`). Inspired by Small Victories (Dropbox → website), but for Are.na.

## Commands

- `npm run dev` — start dev server on localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `DATABASE_URL="file:./dev.db" npx prisma db push` — apply schema changes
- `DATABASE_URL="file:./dev.db" npx prisma studio` — browse database

## Architecture

**Next.js 15 (App Router) + Tailwind v4 + Prisma (SQLite) + Stripe**

### Core Flow
1. User authenticates via Are.na OAuth (`/api/auth/login` → `/api/auth/callback`)
2. Dashboard lists user's sites, "New site" flow: pick channel → pick template → set subdomain
3. Build engine (`src/lib/build.ts`) fetches channel data from Are.na API, normalizes blocks into a `SiteData` shape, applies a Handlebars template, outputs static HTML/CSS to `generated/{subdomain}/`
4. Wildcard subdomain requests are rewritten by middleware to `/api/serve/[subdomain]` which serves the static files

### Key Modules
- `src/lib/arena.ts` — Are.na API client (channels, blocks, user data)
- `src/lib/build.ts` — Static site generator. Normalizes Are.na block types (Image, Text, Link, Media, Attachment) into a template-friendly shape, runs Handlebars
- `src/lib/session.ts` — Encrypted cookie-based sessions (AES-256-CBC)
- `src/lib/db.ts` — Prisma client singleton
- `src/middleware.ts` — Wildcard subdomain routing + auth guard for `/dashboard`

### Templates
Templates live in `templates/{slug}/` and are decoupled from the app. Adding a folder with `meta.json` is enough for it to appear in **New site**, **`/templates`**, and the site settings template picker (`GET /api/templates` reads the disk via `src/lib/templates-manifest.ts`, sorted by display name).

```
templates/blog/
  index.hbs        — Main layout (Handlebars)
  block.hbs        — Block partial (optional; omit if unused)
  style.css        — Styles
  meta.json        — { "name": "...", "description": "..." }
```

**Site creation and production:** `POST /api/sites` and `PATCH /api/sites/[id]` only accept template slugs that exist on disk (`isKnownTemplateSlug`). `runBuild` in `src/lib/build.ts` rejects unknown templates so builds cannot read arbitrary paths. Default template in the new-site UI is **blog** when present, otherwise the first entry from the API.

The data contract passed to templates is the `SiteData` interface in `src/lib/build.ts`. Block types: `image`, `text`, `link`, `media`, `attachment`. In-app docs: `/docs` (block-type table and per-template notes, including **Gallery** masonry + dialog).

### Database (Prisma)
Three models: `User` (Are.na auth + Stripe customer), `Site` (subdomain, channel, template), `Subscription` (free/pro plan).

### Billing
Stripe checkout + webhooks. Free plan = 1 site. Pro = unlimited. Stripe is lazily initialized (not at module load) to avoid build errors when keys aren't set.

## Environment Variables

Copy `.env.local.example` to `.env.local`. Required for full functionality:
- `ARENA_CLIENT_ID` / `ARENA_CLIENT_SECRET` — from https://dev.are.na/oauth/applications
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRO_PRICE_ID` — from Stripe dashboard
- `SESSION_SECRET` — generate with `openssl rand -hex 32`

## Deployment

Designed for Vercel with wildcard domain (e.g., `*.tiny.garden`). Generated sites are stored in `generated/` — on Vercel this would need to move to blob storage or R2.
