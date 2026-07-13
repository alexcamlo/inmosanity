# Plan 009: Parallelize independent route data fetches

> **Executor instructions**: Change only scheduling, not data contracts or cache policies. Preserve null handling introduced by Plan 005. Update the plan index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- app/'(frontend)'/'[lang]'/page.tsx app/'(frontend)'/'[lang]'/propiedades/page.tsx app/'(frontend)'/'[lang]'/propiedad/'[slug]'/page.tsx`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/004-test-framework-boundaries.md`, `plans/005-return-property-404.md`
- **Category**: perf
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The listing route awaits dictionary loading, filter data, and search results sequentially even though they are independent after locale/search params resolve. Home and detail routes have the same pattern. Parallel starts remove avoidable request latency without changing cache behavior or payloads.

## Current state

`app/(frontend)/[lang]/propiedades/page.tsx:19-27` currently does:

```ts
const searchParams = await props.searchParams
const params = await props.params
const dict = await getDictionary(params.lang)
const filtersDD = await getFiltersDropdownValues(params.lang)
const propiedades = await getSearchProperties(searchParams, params.lang)
```

The home route similarly awaits dictionary, `getFrontPage`, then filter values. The property route awaits dictionary before starting `getPropiedadBySlug`. Each function is read-only and has its own cache policy.

Conventions: await route `params`/`searchParams` first, then use `Promise.all` for independent work. Do not move Sanity fetches into components.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Adapter tests | `node_modules/.bin/tsx tests/sanity-client.test.ts` | all pass |
| Full gates | `yarn verify && yarn build` | exit 0 |

## Scope

**In scope**:
- `app/(frontend)/[lang]/page.tsx`
- `app/(frontend)/[lang]/propiedades/page.tsx`
- `app/(frontend)/[lang]/propiedad/[slug]/page.tsx`

**Out of scope**:
- Changing query/cache policies
- Adding client-side fetching or loading states
- Refactoring components
- Combining Sanity queries
- Changing error/404 behavior

## Git workflow

- Branch: `advisor/009-parallel-route-fetches`
- Commit: `perf: parallelize route data fetching`
- Do not push unless instructed.

## Steps

### Step 1: Parallelize the listing route

After awaiting `params` and `searchParams`, start dictionary, filters, and search with one `Promise.all`. Preserve current argument values and destructured names.

**Verify**: `yarn type-check` → exit 0.

### Step 2: Parallelize the home route

After awaiting params, fetch dictionary, front-page data, and filter values together. Destructure the front-page result after resolution without changing render order.

**Verify**: `yarn lint` → exit 0.

### Step 3: Parallelize the detail route

After awaiting params, start dictionary and property fetch together. Preserve the Plan 005 null guard immediately after resolution and before presentation helpers.

**Verify**: `yarn type-check` → non-null property is inferred below the guard.

### Step 4: Run integration gates

**Verify**: `node_modules/.bin/tsx tests/sanity-client.test.ts && yarn verify && yarn build` → exit 0.

Inspect the diff and confirm each route contains one `Promise.all` and no changed JSX/data options.

## Test plan

No timing-based unit test should be added; it would be flaky and test implementation details. Existing adapter tests protect call arguments and build protects route integration. Review the diff to ensure all promises are created in the same expression rather than awaited before `Promise.all`.

## Done criteria

- [ ] Listing's three independent operations start concurrently.
- [ ] Home's three independent operations start concurrently.
- [ ] Detail dictionary/property operations start concurrently.
- [ ] Existing cache/query arguments and rendered output are unchanged.
- [ ] Null property still produces 404.
- [ ] `yarn verify` and `yarn build` pass.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- One operation depends on data from another after code drift.
- Parallelization changes error precedence relied on by an existing test.
- A route now performs side effects rather than read-only fetches.
- Fix requires changing adapters or cache policies.

## Maintenance notes

When adding independent route fetches, place them in the existing `Promise.all`. Do not add timing assertions; review promise construction and use server/request traces for future performance measurement.
