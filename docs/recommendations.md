# Recommendations: Tests, Security, and Performance

This document captures a practical, prioritized improvement plan for this codebase.

## Current baseline

- No automated test files were found (`**/*.{test,spec}.{ts,tsx,js,jsx}` returned none).
- Core risk areas are API routes (`src/app/api/**`), session/auth (`src/lib/session.ts`, OAuth routes), and build/serve pipeline (`src/lib/build.ts`, `src/app/api/serve/**`).

---

## 1) Recommended tests

### P0 (add first)

1. **Session integrity tests** (`src/lib/session.ts`)
   - Ensure tampered cookies are rejected.
   - Ensure malformed cookie payloads return `null` and do not throw.
   - Ensure cookie flags are set correctly in production (`httpOnly`, `secure`, `sameSite`, `path`).

2. **OAuth flow tests** (`src/app/api/auth/login/route.ts`, `src/app/api/auth/callback/route.ts`)
   - Login route should include a random `state` parameter.
   - Callback should reject missing/invalid state.
   - Callback should fail safely when token/user fetch fails.

3. **Asset proxy security tests** (`src/app/api/asset/route.ts`)
   - Reject non-blob hosts.
   - Reject malformed URLs.
   - Verify auth header is only sent to allowed blob hosts.
   - Regression test for host-confusion patterns (`includes` bypass attempts).

4. **Webhook verification tests** (`src/app/api/billing/webhook/route.ts`)
   - Missing signature -> 400.
   - Invalid signature -> 400.
   - Valid `checkout.session.completed` updates subscription as expected.
   - Valid `customer.subscription.deleted` downgrades and removes domains.

5. **Authorization tests for site APIs**
   - `src/app/api/sites/[id]/route.ts`
   - `src/app/api/sites/[id]/build/route.ts`
   - `src/app/api/sites/[id]/domain/route.ts`
   - Confirm users cannot access/modify another user’s site.

### P1 (next wave)

6. **Build pipeline unit tests** (`src/lib/build.ts`)
   - `normalizeBlock` handles v2/v3 Are.na payload variants.
   - URL rewrite behavior for asset proxy URLs.
   - Unknown template slug fails early.

7. **Template manifest tests** (`src/lib/templates-manifest.ts`)
   - Ignores folders without valid `meta.json`.
   - Sort order is stable and deterministic.

8. **Middleware routing tests** (`src/middleware.ts`)
   - Subdomain requests rewrite to `/api/serve/[subdomain]`.
   - Unknown custom domain rewrites to `/api/serve/_custom/[domain]`.
   - Protected route redirect when no session cookie.

### P2 (E2E confidence)

9. **Playwright smoke flows**
   - Login -> create site -> build -> open generated URL.
   - Upgrade flow success/cancel path.
   - Custom domain add/check/remove happy path (mocking Vercel API).

### Suggested test tooling

- **Unit/integration:** Vitest + Testing Library + MSW (for API mocks)
- **E2E:** Playwright
- **DB tests:** isolated test DB (ephemeral Postgres/schema-per-test-run)

---

## 2) Security vulnerabilities and recommendations

### High priority

1. **Asset proxy token leak / SSRF risk**  
   File: `src/app/api/asset/route.ts`
   - Current host allowlist check uses substring matching:
     - `url.includes("vercel-storage.com")` / `url.includes("blob.vercel-storage.com")`
   - This can be bypassed with crafted URLs and may forward `Authorization: Bearer ${BLOB_READ_WRITE_TOKEN}` to attacker-controlled hosts.
   - **Recommendation:**
     - Parse with `new URL(url)`.
     - Enforce `protocol === "https:"`.
     - Enforce exact host allowlist (e.g. `blob.vercel-storage.com` and known official suffix rules).
     - Reject usernames/passwords in URL.
     - Add tests for bypass patterns.

2. **OAuth CSRF protection missing (`state`)**  
   Files: `src/app/api/auth/login/route.ts`, `src/app/api/auth/callback/route.ts`
   - Authorization request does not send `state`.
   - Callback does not verify state.
   - **Recommendation:** Generate and store one-time state (signed cookie), validate in callback, then clear.

3. **Session crypto is encryption-only and has weak default secret fallback**  
   File: `src/lib/session.ts`
   - Uses AES-CBC without authentication (no integrity tag).
   - Falls back to `dev-secret-change-me` if `SESSION_SECRET` is unset.
   - **Recommendation:**
     - Switch to authenticated construction (prefer a maintained session library or AEAD such as AES-GCM).
     - Fail fast at startup if `SESSION_SECRET` is missing in non-dev.
     - Consider secret rotation strategy.

### Medium priority

4. **No explicit CSRF protections on mutating authenticated routes**  
   Examples: `src/app/api/sites/route.ts` (POST), `src/app/api/account/delete/route.ts` (POST), `src/app/api/sites/[id]/domain/route.ts` (POST/DELETE)
   - Cookie auth is used for state-changing endpoints, but there is no CSRF token or Origin/Referer check.
   - **Recommendation:** Add CSRF token middleware or strict Origin checking for all mutating routes.

5. **Template preview path traversal hardening**  
   File: `src/app/api/templates/preview/route.ts`
   - `template` query param is used directly in a filesystem path.
   - **Recommendation:** Validate template slug with `isKnownTemplateSlug` before reading from disk.

6. **Server-side fetch hardening for user-influenced URLs**  
   File: `src/lib/build.ts` (`downloadAndUploadAsset`)
   - Fetches remote asset URLs during builds.
   - **Recommendation:** enforce allowed protocols, size limits, timeouts (`AbortController`), and optionally block private IP ranges.

---

## 3) Performance recommendations

### High impact

1. **Cache template manifest reads**
   - Files: `src/lib/templates-manifest.ts`, `src/app/api/templates/route.ts`
   - `loadTemplatesFromDisk()` reads from disk each call; several APIs depend on it.
   - **Recommendation:** add in-memory cache with TTL/invalidation in dev.

2. **Improve serving cache strategy for generated pages**
   - Files: `src/app/api/serve/[subdomain]/route.ts`, `src/app/api/serve/_custom/[domain]/route.ts`
   - Current cache header is short (`max-age=300`) and no validation headers are exposed.
   - **Recommendation:** add `s-maxage`/`stale-while-revalidate`, and ETag/Last-Modified handling keyed by `lastBuiltAt` or blob metadata.

3. **Avoid buffering large asset responses in memory**
   - File: `src/app/api/asset/route.ts`
   - Uses `arrayBuffer()` then returns full buffer.
   - **Recommendation:** stream upstream response body through to client.

### Medium impact

4. **Optimize Are.na fetch strategy for large channels**
   - File: `src/lib/arena.ts`
   - Strict sequential pagination + enforced min interval can make large builds slow.
   - **Recommendation:** keep rate-limit safety, but consider adaptive concurrency after first page when safe.

5. **Add DB indexes for common filters**
   - File: `prisma/schema.prisma`
   - Frequent lookups filter by `Site.userId`; add `@@index([userId])`.
   - Consider composite index for admin listing patterns if needed.

6. **Move long-running builds to dedicated async worker/queue**
   - Files: `src/app/api/sites/route.ts`, `src/app/api/sites/[id]/build/route.ts`
   - Builds can run up to 300s and are tied to request lifecycle constraints.
   - **Recommendation:** enqueue build jobs and expose status polling/webhook.

---

## 4) Suggested implementation order

1. Patch **asset proxy host validation** + tests.
2. Add **OAuth state** + tests.
3. Replace/harden **session crypto** + tests.
4. Add **CSRF protection** across mutating routes.
5. Add template-manifest caching + basic perf benchmarks.
6. Expand integration + E2E coverage.

---

## 5) Definition of done (recommended)

- Security P0 items resolved and covered by automated tests.
- CI runs unit/integration tests on every PR.
- One E2E smoke suite covers login/create/build/serve happy path.
- Performance changes validated with before/after metrics:
  - template listing latency,
  - site serve response time,
  - build time for small vs large channels.
