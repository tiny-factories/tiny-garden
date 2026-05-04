# Tiny Garden public engineering docs

This folder is the source material for public engineering guides and the
Engineering Docs area in the Tiny Garden Team Space.

## Docs in this set

| Doc | Covers | Primary codepaths |
| --- | --- | --- |
| [Are.na integration](./are-na-integration.md) | OAuth, channel discovery, block fetching, rate-limit behavior, `styles.css` block extraction | `src/app/api/auth/*`, `src/app/api/channels/*`, `src/lib/arena.ts`, `src/lib/channel-styles.ts` |
| [Templates and site themes](./templates-and-site-themes.md) | Template contract, the full shipped template catalog, theme tokens, custom CSS precedence | `templates/*`, `src/lib/build.ts`, `src/lib/templates-manifest.ts`, `src/lib/theme-css-tokens.ts`, `src/app/api/sites/[id]/theme/route.ts`, `src/app/api/sites/[id]/css/route.ts` |
| [Site lifecycle and operations](./site-lifecycle-and-operations.md) | Site creation, rebuilds, publishing, serving, custom domains, operational troubleshooting | `src/app/api/sites/**`, `src/lib/build.ts`, `src/middleware.ts`, `src/app/api/serve/**`, `src/app/api/cron/rebuild/route.ts` |
| [API and CLI reference](./api-and-cli-reference.md) | Session and token auth, public API routes, CLI-oriented examples, quotas | `src/lib/request-auth.ts`, `src/lib/api-tokens.ts`, `src/app/api/tokens/**`, `src/app/api/sites/**`, `cli/README.md` |

## Key knowledge gaps addressed

- The shipped template list is derived from `templates/*/meta.json`, not older
  planning docs.
- Theme behavior is split into saved theme tokens and custom `styles.css`; this
  set documents the order and override rules for publishers.
- Are.na integration details are verified against the API client, including
  OAuth, source filters, pagination, and 429 retry behavior.
- Site lifecycle docs now capture build quotas, automatic rebuild eligibility,
  Blob-backed serving, local fallback, and custom domain verification.
- API examples show the Bearer token path used by CLI/integrators without
  exposing any secrets or environment-specific data.
