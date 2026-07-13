# Plan 005: Return a real 404 for missing properties

> **Executor instructions**: Change the missing-record contract explicitly and update every caller/test. Run the focused adapter test before touching the route. Update `plans/README.md` when complete.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- lib/sanity.client.ts lib/require-property.ts app/'(frontend)'/'[lang]'/propiedad/'[slug]'/page.tsx tests/sanity-client.test.ts tests/require-property.test.ts`
> Plan 004 is expected to have changed test seams; compare behavior, not line numbers.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: `plans/004-test-framework-boundaries.md`
- **Category**: bug
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

Unknown, deleted, or malformed property slugs currently render an empty contact page with HTTP 200. That is misleading to users and produces soft-404 pages for search engines. The data adapter should represent absence as `null`, and the App Router page should invoke `notFound()`.

## Current state

`lib/sanity.client.ts:114-135` promises a property and fabricates one when projection fails:

```ts
export async function getPropiedadBySlug(
  lang: Locale,
  slug: string
): Promise<PropertyDetailProjection> {
  // fetch + projection
  if (projection) return projection
  return {
    _id: '', title: '', slug, price: 0,
    operacion: { name: '', value: '' },
    tipo: '', localizacion: '',
  }
}
```

`app/(frontend)/[lang]/propiedad/[slug]/page.tsx:31-41` casts and renders the result without an absence check. The repo already has `app/(frontend)/[lang]/not-found.tsx`, so use the stock Next `notFound()` mechanism rather than inventing another error component.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Adapter tests | `node_modules/.bin/tsx tests/sanity-client.test.ts` | missing result returns null |
| Route guard test | `node_modules/.bin/tsx tests/require-property.test.ts` | missing handler called exactly once |
| Full tests | `yarn test` | all pass |
| Type/build | `yarn type-check && yarn build` | exit 0 |
| HTTP regression | `curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/es/propiedad/__definitely-missing__` | prints `404` |

## Scope

**In scope**:
- `lib/sanity.client.ts`
- `lib/require-property.ts` (create)
- `app/(frontend)/[lang]/propiedad/[slug]/page.tsx`
- `tests/sanity-client.test.ts`
- `tests/require-property.test.ts` (create)

**Out of scope**:
- Redesigning the 404 page
- Changing projection identity requirements
- Redirecting missing properties to search/home
- Changing static params or sitemap behavior
- Catching Sanity network errors as 404s; transport failures must remain errors

## Git workflow

- Branch: `advisor/005-property-404`
- Commit: `fix: return 404 for missing properties`
- Do not push unless instructed.

## Steps

### Step 1: Change the adapter contract

Change the return type to `Promise<PropertyDetailProjection | null>`. Return `null` only when the fetch completed but `toDetailProjection(raw)` returns `null`. Do not swallow thrown fetch/network errors.

Update Plan 004's characterization test from the fabricated object to an explicit `null` assertion. Add malformed identity cases if not already present.

**Verify**: `node_modules/.bin/tsx tests/sanity-client.test.ts` → valid result projects normally; absent/malformed result is `null`; thrown fetch error still rejects.

### Step 2: Add and test the route guard

Create `lib/require-property.ts` with one generic pure function that accepts `T | null` plus an `onMissing: () => never` callback. It returns the value when present and delegates to `onMissing()` when null. Keep this helper free of Next imports so it is directly testable.

Create `tests/require-property.test.ts` using `node:assert/strict`. Assert that a present object is returned without calling the callback, and null calls a sentinel callback exactly once and propagates its thrown sentinel. This callback represents Next's `notFound()` behavior.

**Verify**: `node_modules/.bin/tsx tests/require-property.test.ts` → both cases pass.

### Step 3: Wire the App Router 404 path

Import `notFound` from `next/navigation` and `requireProperty` from the new helper. Remove the unnecessary cast to `PropertyDetailProjection`. Pass the awaited adapter result and `notFound` to `requireProperty`; below that call, TypeScript must infer a concrete projection.

Keep dictionary lookup and existing rendering unchanged. If Plan 009 has already parallelized dictionary/property fetches, preserve that structure and apply the guard after `Promise.all`.

**Verify**: `yarn type-check` → no cast and no nullable-access errors; `rg -n 'requireProperty.*notFound|notFound.*requireProperty' 'app/(frontend)/[lang]/propiedad/[slug]/page.tsx'` shows the production route wiring.

### Step 4: Verify HTTP behavior against the production server

Run `yarn build`. Start `yarn start` on port 3000 in the existing herdr/tmux session according to the repository's server convention; do not launch an orphaned background process. Wait for the server to report ready, then run:

```bash
status=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/es/propiedad/__definitely-missing__)
test "$status" = 404
echo "missing property status=$status"
```

Expected: prints `missing property status=404` and exits 0. Stop the production server after the check.

## Test plan

- Adapter happy path.
- Null Sanity response.
- Record missing `_id`, title, or slug.
- Fetch rejection remains a rejection, not a 404.
- Pure route guard returns present values and calls the missing handler exactly once for null.
- Mandatory production-server request for a guaranteed-missing slug returns HTTP 404.

## Done criteria

- [ ] `getPropiedadBySlug` returns `PropertyDetailProjection | null`.
- [ ] No fabricated blank property object remains.
- [ ] Detail route wires null through `requireProperty(..., notFound)`.
- [ ] Fetch failures are not converted to 404.
- [ ] Focused tests, `yarn verify`, and `yarn build` pass.
- [ ] Mandatory production-server curl prints HTTP `404` for the missing slug.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- Another caller relies on the fabricated object and cannot safely handle null within scope.
- The test seam from Plan 004 is absent or materially different.
- A network/configuration error is indistinguishable from a missing document.
- Implementing the fix requires changing the global 404 design.

## Maintenance notes

All future “fetch one document” adapters should distinguish absence (`null`) from operational failure (throw). Reviewers should ensure no broad catch block turns outages into false 404s.
