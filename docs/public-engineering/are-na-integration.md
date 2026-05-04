# Are.na integration

Tiny Garden turns an authenticated Are.na channel into a static website. The
application uses Are.na for identity, channel discovery, channel metadata, and
block content.

## Intent

- Let users sign in with their Are.na account.
- Reuse the user's Are.na access token for server-side channel reads.
- Normalize Are.na block data into a stable template contract.
- Keep channel-authored `styles.css` out of site content and use it as optional
  site CSS.

## OAuth sign-in

1. `GET /api/auth/login` redirects to Are.na OAuth:

   ```txt
   https://www.are.na/oauth/authorize
     ?client_id=...
     &redirect_uri=...
     &response_type=code
     &scope=write
   ```

2. `GET /api/auth/callback` exchanges the code at
   `https://api.are.na/v3/oauth/token`.
3. The callback fetches `https://api.are.na/v3/me`.
4. The app upserts a `User` row with:
   - `arenaId`
   - `arenaUsername`
   - `arenaToken`
   - `avatarUrl`
5. A signed Tiny Garden session cookie stores the internal user id and Are.na
   identity needed for later requests.

Primary codepaths:

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/callback/route.ts`
- `src/lib/session.ts`
- `prisma/schema.prisma`

## API client behavior

All normal Are.na reads go through `ArenaClient` in `src/lib/arena.ts`.

```ts
const client = new ArenaClient(auth.arenaToken);
const channel = await client.getChannel("example-channel");
const blocks = await client.getAllChannelBlocks("example-channel");
```

Client constraints:

- Base URL: `https://api.are.na/v3`.
- Every request uses `Authorization: Bearer <arena token>`.
- Requests are spaced by at least about 300 ms per client instance.
- A `429` response is retried once. The retry waits until
  `X-RateLimit-Reset` when present, bounded between 1 and 60 seconds.
- Non-OK responses after retry throw `Are.na API error: <status> <statusText>`.

## Channel discovery

Dashboard channel pickers call `GET /api/channels?source=...`.

| Source | Are.na reads | Response shape |
| --- | --- | --- |
| `own` | `/users/{id}/contents?type=Channel` | Flat channel array |
| `groups` | `/users/{id}/groups`, then each group `/contents?type=Channel` | Group objects with `channels` |
| `following` | `/users/{id}/following?type=Channel` filtered to channel-like items | Flat channel array |

Search uses `GET /api/channels/search?q=term`. Queries shorter than two
characters return an empty list.

Primary codepaths:

- `src/app/api/channels/route.ts`
- `src/app/api/channels/search/route.ts`
- `src/lib/arena.ts`

## Channel and block fetching

Builds fetch the selected channel and every page of channel contents:

```ts
const channel = await client.getChannel(site.channelSlug);
const blocks = await client.getAllChannelBlocks(site.channelSlug);
```

`getAllChannelBlocks()` requests `/channels/{slug}/contents` with
`per=100`, increments `page`, and stops when `meta.has_more_pages` is false.

The build normalizes Are.na block types into five template types:

| Are.na block | Template type | Notes |
| --- | --- | --- |
| `Image` / `image` | `image` | Uses original, large, square, display URLs when available. |
| `Text` / `text` | `text` | Uses Are.na HTML content when provided. |
| `Link` / `link` | `link` | Uses source URL, title, description, provider, and preview image. |
| `Media`, `Embed`, lowercase variants | `media` | Uses embed URL and embed HTML. |
| `Attachment` / `attachment` | `attachment` | Adds file kind, extension, display labels, preview URLs, and boolean flags. |

Every normalized block includes metadata such as `id`, `position`,
`created_at`, `updated_at`, `comment_count`, `source_url`, and
`arena_url`.

Primary codepaths:

- `src/lib/build.ts` (`normalizeBlock`, `channelBlocksForTemplate`)

## The `styles.css` channel block

Publishers can add CSS from Are.na without opening Tiny Garden:

1. Create a Text block in the channel.
2. Title it `styles.css`.
3. Put plain CSS in the block body.

Example Are.na Text block body:

```css
:root {
  --block-radius: 14px;
}

article img {
  border-radius: var(--block-radius);
}
```

Tiny Garden treats a block title as reserved when it normalizes to
`styles.css`. The check is case-insensitive and tolerates non-breaking spaces,
zero-width characters, common HTML entities, and Unicode compatibility forms.

Reserved `styles.css` blocks are:

- extracted as channel CSS;
- hidden from template block output;
- ignored if saved site CSS exists in the Tiny Garden database.

Primary codepaths:

- `src/lib/channel-styles.ts`
- `src/lib/build.ts`
- `src/app/api/sites/[id]/css/route.ts`

## Operational notes and pitfalls

- Are.na tokens are stored server-side and should never be exposed in public
  docs, logs, screenshots, or client code examples.
- Heavy builds may be slow because all channel pages are fetched and asset
  mirroring can fetch many external files.
- A channel that cannot be loaded during site setting changes returns:
  `"That channel could not be loaded. Check the slug or your access on Are.na."`
- If a visible site contains a `styles.css` text block, verify the title, block
  type, and whether the build used `filterOutChannelStylesBlocks()`.
- Automatic rebuilds compare `channel.updated_at` with `site.lastBuiltAt`; not
  every plan is eligible for automatic rebuilds.

