# Plan 006: Make the default property search show sale listings only

> **Executor instructions**: Treat the URL/search criteria module as the single source of truth. Add the failing pure test first, then align parsing, caching, and UI expectations. Update the index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- lib/property-search.ts lib/sanity.cache.ts components/ui/filters.tsx tests/property-search.test.ts tests/sanity-cache.test.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-add-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

Visiting `/[lang]/propiedades` without query parameters shows the sale toggle, but the server query omits `operacion` and returns both rentals and sales. The architecture and cache comments explicitly describe the default as the sale view. Users must see results that match the visible controls.

## Current state

- `lib/property-search.ts:21-24` defines `OPERACION_VENTA` as the default operation.
- `hasActiveFilters` at lines 80-107 treats sale as the non-active default.
- `parseSearchParams` at lines 110-133 returns `{}` for absent/empty parameters.
- Query construction at lines 167-170 only adds an operation predicate if criteria contains one.
- `components/ui/filters.tsx:108-119` initializes the visible operation to `OPERACION_VENTA` when the URL omits it.
- At the planned commit, `buildPropertySearchQuery(parseSearchParams({}))` produced `*[_type == 'propiedad']...` with no `$operacion` parameter.
- Existing pure test style is `tests/property-search.test.ts` using `node:assert/strict`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Search tests | `node_modules/.bin/tsx tests/property-search.test.ts` | all pass |
| Cache tests | `node_modules/.bin/tsx tests/sanity-cache.test.ts` | all pass |
| Full gates | `yarn verify && yarn build` | exit 0 |

## Scope

**In scope**:
- `lib/property-search.ts`
- `tests/property-search.test.ts`
- `tests/sanity-cache.test.ts` if expectations need clarification
- `components/ui/filters.tsx` only if it must consume an exported default criteria constant

**Out of scope**:
- Changing operation IDs/sentinel values
- Adding pagination
- Redesigning filters
- Changing filtered-search `no-store` policy
- Validating all Sanity reference IDs against live data

## Git workflow

- Branch: `advisor/006-default-sale-search`
- Commit: `fix: align default property search`
- Do not push unless instructed.

## Steps

### Step 1: Add regression tests for default semantics

Update `tests/property-search.test.ts` to assert:

1. `parseSearchParams(undefined)`, `null`, and `{}` return criteria with `operacion: OPERACION_VENTA`.
2. Criteria with other filters but no operation still defaults to sale.
3. An explicit rental operation remains rental.
4. The default built query contains `operacion._ref == $operacion` and params contain the sale ID.
5. Serializing default criteria produces an explicit sale operation when used to create a URL.

Keep `hasActiveFilters({})` and explicit sale classified as non-active so the default query remains cacheable.

**Verify before fix**: focused test fails on default parsing/query assertions.

### Step 2: Centralize default criteria

Replace or rename `EMPTY_SEARCH_CRITERIA` with an immutable exported default representing sale, for example `DEFAULT_SEARCH_CRITERIA`. Make `parseSearchParams` use that default whenever operation is absent while preserving independently parsed filters.

Do not mutate/reuse a shared object in a way callers can modify. Return a new criteria object.

**Verify**: `node_modules/.bin/tsx tests/property-search.test.ts` → all default, rental, sentinel, numeric, and round-trip tests pass.

### Step 3: Confirm cache classification remains consistent

Ensure `getSearchListingOptions({})` and explicit default-sale params still use the named `propiedades` cache policy, while rental/other active filters remain `no-store`.

**Verify**: `node_modules/.bin/tsx tests/sanity-cache.test.ts` → all pass, including explicit default sale and rental cases.

### Step 4: Remove duplicated UI defaults if safe

If `components/ui/filters.tsx` can consume the exported default without complicating client imports, use it so UI and query semantics cannot drift. Retain the exported scalar `OPERACION_VENTA` for toggle values. Do not refactor unrelated filter state.

**Verify**: `yarn type-check && yarn lint` → exit 0.

### Step 5: Run full gates

**Verify**: `yarn verify && yarn build` → exit 0.

## Test plan

Use the current property-search test as the pattern. Cover missing parameters, unrelated filter without operation, explicit sale, explicit rental, serialization, query predicate/params, and cache policy. No live Sanity request is required.

## Done criteria

- [ ] Empty search criteria means sale in parser and query.
- [ ] Visible default and server results use the same operation.
- [ ] Rental remains explicit and `no-store`.
- [ ] Default sale remains cacheable.
- [ ] Focused tests, `yarn verify`, and `yarn build` pass.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- Product intent has changed to “all operations” as the default; obtain confirmation instead of choosing.
- Sanity's sale operation ID differs from the exported constant.
- The fix requires changing persisted URLs or schema IDs.
- Cache tests reveal that default queries intentionally bypass caching.

## Maintenance notes

Future filter defaults must be defined in `lib/property-search.ts` and consumed by both UI and query construction. Reviewers should reject separate “default” constants in components.
