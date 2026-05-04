# Site lifecycle and operations

Tiny Garden turns an Are.na channel into static HTML, then serves that HTML on a
Tiny Garden subdomain or verified custom domain.

## Site creation

`POST /api/sites` creates a site for the authenticated user.

Required JSON:

```json
{
  "channelSlug": "my-arena-channel",
  "template": "blog",
  "subdomain": "my-garden"
}
```

Optional fields:

- `channelTitle` falls back to `channelSlug`.
- `initialTheme` is admin-only and is normalized before storage.

Constraints:

- `subdomain` is normalized with `normalizeSiteSubdomain()` and must be DNS-safe.
- `template` must exist on disk; validation uses `isKnownTemplateSlug()`.
- Subdomains are unique.
- Free users can create up to 3 sites; Pro users have no coded limit; Studio is
  capped at 50. Admin and friend accounts bypass the plan limit.
- If beta access is full, new free site creation can be blocked.

Codepaths:

- `src/app/api/sites/route.ts`
- `src/lib/subdomain.ts`
- `src/lib/templates-manifest.ts`
- `src/lib/beta.ts`

## Build pipeline

`buildSite(siteId)`:

1. Loads the `Site` and owner Are.na token from Prisma.
2. Fetches channel metadata and all channel blocks through `ArenaClient`.
3. Extracts channel CSS from a reserved `styles.css` block.
4. Resolves effective CSS: saved site CSS wins over channel CSS.
5. Normalizes Are.na blocks to the template data contract.
6. Loads `templates/{slug}/index.hbs`, `style.css`, and optional partials.
7. Applies template HTML, theme CSS/font links, favicon, footer, and site CSS.
8. Writes output to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is present; otherwise
   writes to local `generated/{subdomain}/` in development.
9. Updates `lastBuiltAt`, clears `lastBuildError`, marks the site published, and
   stores `blobUrl` when Blob is used.

The build records a truncated `lastBuildError` on failure.

Codepaths:

- `src/lib/build.ts`
- `src/lib/channel-styles.ts`
- `src/lib/theme-css-tokens.ts`
- `src/lib/site-static-html.ts`

## Manual rebuilds

`POST /api/sites/{id}/build` runs a rebuild for the site owner.

Example:

```bash
curl -X POST "https://tiny.garden/api/sites/site_id/build" \
  -H "Authorization: Bearer tg_pat_example"
```

Limits for non-admin/non-friend accounts:

| Plan | Accepted builds per UTC day | Per-site cooldown |
| --- | ---: | ---: |
| Free | 10 | 5 minutes |
| Pro | 100 | 5 minutes |
| Studio | 500 | 5 minutes |

If rejected, the route returns HTTP `429` with:

- `code: "build_cooldown"` and `details.retryAfterSeconds`
- or `code: "build_quota_exceeded"` and daily quota details

Codepaths:

- `src/app/api/sites/[id]/build/route.ts`
- `src/lib/build-limits.ts`
- `prisma/schema.prisma` (`BuildRequest`)

## Publishing and previews

Builds mark the site `published: true`. The owner can also patch `published`
directly through `PATCH /api/sites/{id}`.

```json
{ "published": false }
```

Owner-only preview uses the latest successful build and does not require the
site to be published:

```text
/api/sites/{id}/preview
/api/sites/{id}/preview/block-123.html
```

Only `index.html` and `block-{id}.html` are served through preview or public
static routes.

Codepaths:

- `src/app/api/sites/[id]/route.ts`
- `src/app/api/sites/[id]/preview/[[...path]]/route.ts`
- `src/lib/site-static-html.ts`

## Public serving

Wildcard site requests are rewritten by middleware:

```text
https://{subdomain}.{NEXT_PUBLIC_SITE_DOMAIN}/
  -> /api/serve/{subdomain}

https://{subdomain}.{NEXT_PUBLIC_SITE_DOMAIN}/block-123.html
  -> /api/serve/{subdomain}/block-123.html
```

Development also supports `*.localhost`.

The serve route returns `404` unless the site exists and is published. If the
site has a `blobUrl`, HTML is fetched from Blob; otherwise local development
falls back to `generated/{subdomain}/`.

Codepaths:

- `src/middleware.ts`
- `src/app/api/serve/[subdomain]/route.ts`
- `src/lib/site-static-html.ts`

## Custom domains

Custom domains are available to admin, friend, Pro, and Studio accounts.

`POST /api/sites/{id}/domain`:

```json
{ "domain": "example.com" }
```

Behavior:

- Strips `http://`, `https://`, and trailing slashes.
- Requires a basic host-like domain format.
- Rejects a domain already attached to another site.
- Adds the domain to Vercel.
- Stores `customDomain` and resets `domainVerified` to false.
- Returns Vercel verification and DNS config when available.

`GET /api/sites/{id}/domain` checks Vercel status and updates
`domainVerified` when the verified state changes.

`DELETE /api/sites/{id}/domain` removes the domain from Vercel when possible
and clears the stored domain fields.

Custom-domain traffic is served only when:

- the request host is not the app domain,
- a site owns that `customDomain`,
- the site is published,
- and `domainVerified` is true.

Codepaths:

- `src/app/api/sites/[id]/domain/route.ts`
- `src/app/api/serve/_custom/[domain]/route.ts`
- `src/lib/vercel.ts`
- `src/middleware.ts`

## Automatic rebuild cron

`GET /api/cron/rebuild` is protected by:

```text
Authorization: Bearer {CRON_SECRET}
```

It only considers published sites whose owners are:

- admin,
- friend,
- Pro,
- or Studio.

For each eligible site, it fetches channel metadata from Are.na and rebuilds
only when `channel.updated_at` is newer than `site.lastBuiltAt`. The cron pauses
one second between rebuilt sites.

Response example:

```json
{
  "rebuilt": 2,
  "skipped": 10,
  "failed": 1,
  "total": 13
}
```

Codepath: `src/app/api/cron/rebuild/route.ts`.

## Asset mirroring

When `BLOB_READ_WRITE_TOKEN` is configured, builds copy images, link thumbnails,
attachments, and the channel avatar into Vercel Blob. Generated HTML rewrites
those URLs through:

```text
/api/asset?url={blobUrl}
```

The asset proxy only fetches Vercel Blob URLs and returns long-lived cache
headers. Individual mirrored assets are capped before buffering.

Codepaths:

- `src/lib/build.ts`
- `src/app/api/asset/route.ts`

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Public site returns 404 | Site must exist, be published, and request an allowed HTML filename. Custom domains also require `domainVerified`. |
| Rebuild returns 429 | Check per-site cooldown and daily build quota in `src/lib/build-limits.ts`. |
| New site creation says template is invalid | Confirm `templates/{slug}/meta.json` exists and is readable. |
| Channel changes are not auto-publishing | Automatic rebuild is only for published sites owned by Pro, Studio, admin, or friend users. Free users rebuild manually. |
| Custom domain is added but not serving | Use `GET /api/sites/{id}/domain` to refresh Vercel config and verify DNS. |
| Assets point at `/api/asset` | Blob mirroring is enabled; this is expected and keeps private Blob URLs behind the app route. |
