# tiny.garden CLI Site Management Spec

Status: Proposed  
Owner: Engineering  
Last updated: 2026-04-04

## 1) Overview

This document specifies a customer-facing CLI that supports:

1. End-to-end site creation (`new site` flow)
2. Site search across:
   - the user's own sites
   - all discoverable public sites
3. In-terminal theme/CSS editing and push
4. Manual site refresh/rebuild with cost controls
5. Local site backup/archive export

The CLI should reuse existing application/business logic where possible and avoid duplicating validation already implemented in API routes.

---

## 2) Goals and non-goals

## Goals

- Ship a usable CLI for customer workflows without requiring dashboard UI for common operations.
- Keep auth secure and revocable.
- Preserve existing pricing/plan limits and beta gating behavior.
- Add cost controls to rebuild/refresh actions.
- Provide scriptable (non-interactive) command variants.

## Non-goals (v1)

- Full offline WYSIWYG editor for templates
- Editing template files on server disk (`templates/*/style.css`) at runtime
- Arbitrary collaborative editing sessions
- Cross-account admin features in public CLI

---

## 3) Architecture summary

## Existing behavior reused

- `POST /api/sites` creation + plan/beta/template checks
- `GET /api/templates`, `GET /api/channels`
- `POST /api/sites/[id]/build` rebuild
- `GET/PUT /api/sites/[id]/theme` theme variable management

## New foundation required

1. CLI auth path (Bearer token; existing browser cookie auth remains)
2. Public site discovery search API
3. Site CSS API (site-level override string)
4. Rebuild throttle/quota enforcement
5. Export metadata helper endpoint (optional but recommended)

---

## 4) Authentication and authorization

## 4.1 Auth strategy

Add API token auth for CLI while preserving cookie sessions for web.

- New request auth helper:
  - attempts Bearer token first
  - falls back to existing session cookie (`getSession`)
- Token hashes stored server-side (never plaintext).

## 4.2 Prisma model changes

Add model:

```prisma
model ApiToken {
  id           String   @id @default(cuid())
  userId       String
  name         String
  tokenHash    String   @unique
  prefix       String   // display/debug only, e.g. "tg_pat_ab12"
  scopes       String   @default("all") // future-proof
  lastUsedAt   DateTime?
  expiresAt    DateTime?
  revokedAt    DateTime?
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, revokedAt])
}
```

## 4.3 Token lifecycle endpoints

- `POST /api/tokens` -> create token (returns plaintext once)
- `GET /api/tokens` -> list active/revoked tokens (no plaintext)
- `DELETE /api/tokens/:id` -> revoke token

Auth for token endpoints: existing cookie session only.

## 4.4 CLI local credential storage

Priority order:

1. OS keychain (if supported in chosen implementation)
2. `~/.config/tiny-garden/config.json` (0600 permissions) fallback

Fields:

```json
{
  "apiBaseUrl": "https://tiny.garden",
  "token": "tg_pat_..."
}
```

---

## 5) Data model updates (site discoverability + CSS + build metering)

## 5.1 Site discoverability

Add:

```prisma
discoverable Boolean @default(true)
```

Meaning: if `published=true` and `discoverable=true`, site appears in public search index/results.

## 5.2 Site custom CSS

`Site.customCss` already exists and is currently not exposed in API settings flow.  
Reuse this field for CLI and future dashboard integration.

Behavior:

- Store raw CSS string per site
- Inject at build-time as final cascade layer (after template and theme variables)
- Maximum length guard (e.g. 100KB)

## 5.3 Build metering table

Add:

```prisma
model BuildRequest {
  id          String   @id @default(cuid())
  siteId      String
  userId      String
  trigger     String   // "web" | "cli" | "cron" | "api"
  status      String   // "accepted" | "rejected_quota" | "rejected_cooldown" | "failed" | "succeeded"
  reason      String?  // optional details
  createdAt   DateTime @default(now())

  site        Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([siteId, createdAt])
}
```

---

## 6) API specification

All endpoints accept either:

- Cookie session auth (web)
- `Authorization: Bearer <token>` (CLI)

Error format standard:

```json
{
  "error": "Human-readable message",
  "code": "machine_code",
  "details": {}
}
```

## 6.1 Site search API

### `GET /api/sites/search`

Query params:

- `q` (string; optional, default empty)
- `scope` (`mine` | `public` | `all`; default `mine`)
- `limit` (int 1-50, default 20)
- `cursor` (opaque string; optional)

Behavior:

- `mine`: requires auth, returns user's sites (published + draft)
- `public`: auth optional, returns discoverable + published sites
- `all`: requires auth, merges `mine` + `public`, dedupe by site id

Response:

```json
{
  "items": [
    {
      "id": "cuid",
      "subdomain": "my-site",
      "channelTitle": "My Channel",
      "channelSlug": "my-channel",
      "template": "blog",
      "published": true,
      "discoverable": true,
      "owner": {
        "arenaUsername": "owner-name",
        "isSelf": true
      },
      "url": "https://my-site.tiny.garden",
      "updatedAt": "2026-04-04T12:00:00.000Z"
    }
  ],
  "nextCursor": "opaque-or-null"
}
```

## 6.2 Site CSS API

### `GET /api/sites/:id/css`

Returns:

```json
{
  "css": "/* raw css */",
  "updatedAt": "..."
}
```

### `PUT /api/sites/:id/css`

Request:

```json
{
  "css": "body { ... }",
  "mode": "replace" // optional: replace only; append handled client-side
}
```

Validation:

- owner-only
- CSS length <= 100KB
- UTF-8 text only

Response:

```json
{
  "success": true,
  "cssLength": 1234
}
```

## 6.3 Site export metadata API (recommended)

### `GET /api/sites/:id/export`

Returns:

```json
{
  "siteId": "cuid",
  "subdomain": "my-site",
  "url": "https://my-site.tiny.garden",
  "published": true,
  "lastBuiltAt": "2026-04-04T12:00:00.000Z",
  "contentType": "text/html"
}
```

Purpose: lets CLI verify ownership and canonical URL before fetching archive content.

## 6.4 Build/refresh policy updates

### Existing endpoint: `POST /api/sites/:id/build`

Enhance with:

- per-site cooldown (default 5 minutes)
- per-user daily quota by plan (example defaults):
  - free: 10/day manual rebuilds
  - pro: 100/day
  - studio: 500/day
  - admin/friend: bypass or high cap

Rejected response example:

```json
{
  "error": "Rebuild cooldown active. Try again in 2m 10s.",
  "code": "build_cooldown",
  "details": { "retryAfterSeconds": 130 }
}
```

Quota response example:

```json
{
  "error": "Daily rebuild quota reached for your plan.",
  "code": "build_quota_exceeded",
  "details": { "limit": 10, "used": 10, "period": "day" }
}
```

---

## 7) CLI command specification

Binary name in spec: `tg` (final naming to confirm).

## 7.1 Auth commands

### `tg auth login`

Options:

- `--token <value>` (optional; if omitted prompt for paste)
- `--api <url>` (default `https://tiny.garden`)

Behavior:

- verify via `GET /api/account`
- persist credentials

### `tg auth whoami`

Displays account handle, plan, site count, beta flags.

### `tg auth logout`

Removes local token/config.

## 7.2 Site creation and listing

### `tg new`

Interactive prompts:

1. channel source + search + pick
2. template pick
3. subdomain (with availability errors surfaced)
4. create and optionally wait for publish

Flags:

- `--channel <slug>`
- `--template <slug>`
- `--subdomain <name>`
- `--wait`
- `--json`
- `--yes`

### `tg sites`

Lists owned sites; supports:

- `--search <query>`
- `--json`

## 7.3 Search commands

### `tg search <query>`

Flags:

- `--scope mine|public|all` (default `all` for this command)
- `--limit <n>`
- `--json`

Output columns:

- subdomain/url
- channel title
- owner
- template
- published/discoverable status

## 7.4 Theme editing commands

### `tg site theme edit <site>`

Flow:

1. fetch `/api/sites/:id/theme`
2. write temporary editable file (YAML or JSON)
3. open with `$EDITOR`, fallback `nano`
4. validate schema
5. `PUT /api/sites/:id/theme`
6. prompt to trigger rebuild now

### `tg site theme set <site> --bg <hex> --text <hex> --accent <hex> --border <hex> --heading <font> --body <font>`

Scriptable variant.

## 7.5 CSS editing commands

### `tg site css edit <site>`

Flow:

1. fetch current CSS
2. open temp file in `$EDITOR`/`nano`
3. detect change
4. push with `PUT /api/sites/:id/css`
5. optional rebuild prompt

### `tg site css push <site> --file <path>`

Reads local file and pushes to site CSS.

### `tg site css pull <site> --out <path>`

Saves current site CSS locally.

## 7.6 Manual refresh command

### `tg site refresh <site>`

Flags:

- `--wait` (poll until published/build complete)
- `--timeout <seconds>` (default 180)
- `--json`

Maps to `POST /api/sites/:id/build`; surfaces quota/cooldown errors clearly.

## 7.7 Backup/archive commands

### `tg site backup <site>`

Flags:

- `--out <path>` (required)
- `--mode html|mirror` (default `html`)
- `--zip`
- `--filename <name>`

Modes:

- `html`: save exact served HTML response as `index.html`
- `mirror`: fetch HTML, download referenced absolute assets, rewrite links to local relative paths

Output example:

```
Saved backup:
  /Users/alex/Sites/my-site-backup/index.html
  /Users/alex/Sites/my-site-backup/assets/*
```

---

## 8) Build pipeline changes for CSS

In `src/lib/build.ts`:

1. Keep loading template `style.css` as today.
2. Keep existing theme variable injection.
3. Add final injection for `site.customCss`:

```html
<style id="tiny-garden-site-css">
/* user site css */
...</style>
```

This ensures user CSS wins by cascade and does not mutate template files on disk.

---

## 9) Security and abuse controls

- Rate-limit token creation endpoint.
- Enforce token hash-only persistence.
- Validate and bound all query params for search.
- Restrict search `limit` max to 50.
- Rebuild cooldown/quota checks before expensive Are.na fetch/build operations.
- Record BuildRequest rows for accepted and rejected attempts.
- Ensure `public` search only includes `published && discoverable`.

---

## 10) Observability

Track events/logging for:

- CLI token created/revoked
- CLI site create success/failure
- CLI search usage by scope
- CSS/theme updates
- rebuild request accepted/rejected (with code)
- backup export usage (`html` vs `mirror`)

Add metrics:

- rebuild rejection rate by plan
- average rebuild runtime
- public search query volume and p95 latency

---

## 11) Testing requirements

## API tests

- auth helper resolves bearer token + cookie session correctly
- token revocation blocks access
- `/api/sites/search` scope and discoverable filtering
- `/api/sites/:id/css` ownership and size limits
- build cooldown/quota responses and retry metadata

## CLI tests

- command parsing and flags
- interactive flow snapshots (prompt-driven)
- editor workflow temp file roundtrip
- backup mode outputs (`html` and `mirror`)
- error handling for quota/cooldown/401/404

## End-to-end tests

- create site via CLI from channel/template/subdomain
- edit CSS, refresh, verify published output changed
- export backup to local directory

---

## 12) Rollout plan

## Phase 1: Foundation

- ApiToken model + endpoints + auth helper
- bearer auth support on existing routes

## Phase 2: CLI MVP

- `auth login`, `auth whoami`, `new`, `sites`, `site refresh`

## Phase 3: Discovery + editing

- `sites/search` endpoint
- CLI `search`
- CLI `site theme edit`, `site css edit/push/pull`
- build pipeline custom CSS injection

## Phase 4: Export + hardening

- CLI backup (`html`)
- CLI backup mirror mode
- quotas/cooldowns enabled and tuned
- docs and support playbook updates

---

## 13) Open decisions to finalize

1. CLI package distribution:
   - bundled in same repo as `packages/cli` vs separate repo/package
2. Default `tg search` scope:
   - `all` (best UX) vs `mine` (privacy-first default)
3. Public index discoverability:
   - default true for all existing published sites, or one-time migration prompt
4. Cooldown/quota exact thresholds by plan
5. Whether token scopes are needed in v1 (`read`, `write`, `build`, `admin`)

---

## 14) Backward compatibility notes

- Existing web dashboard behavior remains unchanged.
- Cookie-based auth continues to work.
- Existing `POST /api/sites/:id/build` clients continue to function; they may receive new structured errors when throttled.
- Existing sites default to `discoverable=true` unless migration strategy dictates otherwise.
