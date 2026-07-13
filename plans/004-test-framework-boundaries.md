# Plan 004: Characterize Sanity adapters and the signed webhook route

> **Executor instructions**: This is a characterization-test plan, not a behavior-change plan. Preserve current public behavior except for introducing narrow dependency seams. Run every focused test after each seam. Update the index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- lib/sanity.client.ts app/api/revalidate/route.ts lib/content-freshness.ts tests/sanity-client.test.ts tests/revalidate-route.test.ts`
> If Plan 002 changed framework types, reconcile them without changing behavior.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-add-verification-baseline.md`, `plans/002-patch-next-runtime.md`
- **Category**: tests / architecture
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

Current tests cover pure search, projection, cache, and tag functions, but not the route-facing Sanity adapter or signed webhook. Query selection, locale parameters, cache options, signature status codes, and actual `revalidateTag` calls can regress while every current test passes. Narrow injectable dependencies make these boundaries testable without adding a general-purpose mocking framework.

## Current state

- `lib/sanity.client.ts:35-160` directly closes over the module-level Sanity `client` in seven exported functions.
- `getSearchProperties` at lines 77-98 combines parsing, GROQ building, locale injection, cache selection, fetch, and projection.
- `app/api/revalidate/route.ts:27-62` directly imports `parseBody` and `revalidateTag` and handles missing secret, invalid signature, body validation, tag invalidation, and exceptions.
- `tests/sanity-revalidation.test.ts:1-4` imports only the pure `getRevalidationTags` helper; it does not execute the route.
- Existing tests use top-level `node:assert/strict` and no Jest/Vitest. Match that style.
- Security boundary: tests may use a literal dummy secret such as `test-secret`; never read or print the real environment value.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Adapter tests | `node_modules/.bin/tsx tests/sanity-client.test.ts` | all cases pass |
| Route tests | `node_modules/.bin/tsx tests/revalidate-route.test.ts` | all cases pass |
| Full gates | `yarn verify && yarn build` | exit 0 |

## Scope

**In scope**:
- `lib/sanity.client.ts`
- `app/api/revalidate/route.ts`
- One small new helper module under `lib/` if needed for webhook dependency injection
- `tests/sanity-client.test.ts` (create)
- `tests/revalidate-route.test.ts` (create)

**Out of scope**:
- Changing missing-property behavior (Plan 005)
- Changing accepted webhook document types or cache tags
- Disabling signature validation
- Adding Jest/Vitest or network calls
- Refactoring schemas, queries, projections, or UI

## Git workflow

- Branch: `advisor/004-test-framework-boundaries`
- Commit: `test: cover Sanity integration boundaries`
- Do not push unless instructed.

## Steps

### Step 1: Introduce a narrow fetch dependency

Define the smallest local interface required by adapter functions: an object with the compatible `fetch` method. Permit tests to supply that dependency through either:

- a `createSanityDataAdapter(fetchClient)` factory whose returned methods back the existing named exports, or
- an optional final parameter defaulting to the production `client`.

Prefer the factory if it keeps production exports thin and avoids adding test-oriented optional arguments to route-facing APIs. Do not change query strings, parameters, cache options, or fallback values in this plan.

**Verify**: `yarn type-check` → exit 0 before tests are added.

### Step 2: Characterize adapter orchestration

Create `tests/sanity-client.test.ts` with a fake client that records each `fetch(query, params, options)` call and returns controlled data. Cover at minimum:

- `getFrontPage`: query, `{lang}`, front-page policy, latest projection filtering.
- `getFiltersDropdownValues`: one combined query with filter policy.
- `getSearchProperties`: criteria parameters plus `lang`, cached default search, `no-store` filtered search, malformed non-array response.
- `getAllPropiedadesSlug`: projection of string slugs and malformed entries.
- `getPropiedadBySlug`: valid detail projection and current missing-record fallback (characterization only; Plan 005 changes it).
- Page getters: page query parameters and page policy.

Use identity checks against imported query constants and deep equality for params/options.

**Verify**: `node_modules/.bin/tsx tests/sanity-client.test.ts` → all cases pass without network access.

### Step 3: Extract a webhook handler seam

Keep `POST(request)` as the Next route export. Extract a function/factory that accepts dependencies for body parsing, tag invalidation, tag mapping, secret lookup/value, and logging. Production `POST` wires the existing `parseBody`, `revalidateTag`, `getRevalidationTags`, environment variable, and console logger.

The seam must not allow production callers to bypass signature validation. Keep the production response bodies/status codes unchanged.

**Verify**: `yarn type-check` → exit 0; exported `POST` still has the Next route-compatible signature.

### Step 4: Test webhook statuses and side effects

Create `tests/revalidate-route.test.ts`. Use dummy requests and injected async functions; do not calculate real signatures. Cover:

1. Missing secret → 500, parser and invalidator not called.
2. Invalid signature → 401, no invalidation.
3. Valid signature with missing body → 400.
4. Valid accepted property body → 200 and every mapped tag invalidated once with profile `'max'`.
5. Unknown type/tag-mapper exception → 500.
6. Parser exception → 500 without exposing exception details in JSON.

Assert JSON response shapes and call records.

**Verify**: `node_modules/.bin/tsx tests/revalidate-route.test.ts` → all cases pass.

### Step 5: Run complete gates

**Verify**: `yarn verify && yarn build` → exit 0 and no network calls occur during unit tests.

## Test plan

Use existing `tests/sanity-revalidation.test.ts` and `tests/sanity-cache.test.ts` as patterns. New tests must assert both returned values and dependency call arguments; assertions that only check “did not throw” are insufficient.

## Done criteria

- [ ] Sanity adapter tests run without network access.
- [ ] Webhook route tests cover all six status/side-effect cases.
- [ ] Production exported function names and route signature remain compatible.
- [ ] No signature or cache-tag behavior changed.
- [ ] `yarn verify` and `yarn build` pass.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- A seam would expose a production path that bypasses webhook signature validation.
- Testing requires a real Sanity token, webhook secret, or network call.
- Current behavior differs materially from the excerpts because another plan landed first.
- The refactor grows beyond a small factory/helper and changes public data shapes.

## Maintenance notes

Keep the fake dependencies local to tests; do not create a global service container. Future cache/query changes must update the call-argument assertions intentionally. Plan 005 relies on these tests before changing the missing-property contract.
