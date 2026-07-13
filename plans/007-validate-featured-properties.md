# Plan 007: Validate featured properties before rendering image URLs

> **Executor instructions**: Add a typed projection at the data boundary; do not scatter defensive checks through the slider. Add tests before switching the adapter. Update the plan index when complete.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- lib/property-projection.ts lib/interfaces.ts lib/sanity.client.ts components/FeaturedSlider.tsx tests/property-projection.test.ts tests/sanity-client.test.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/004-test-framework-boundaries.md`
- **Category**: bug
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The homepage accepts featured CMS records without normalization. `FeaturedSlider` immediately builds full and thumbnail URLs for every record, so one featured property without `images[0]` throws before the later JSX guard and can take down the homepage. Incomplete records should be rejected at the same projection boundary already used by latest/search/detail data.

## Current state

`lib/sanity.client.ts:35-48` validates `latest` but not `featured`:

```ts
const featured = Array.isArray(raw?.featured) ? raw.featured : []
const latest = Array.isArray(raw?.latest)
  ? raw.latest.map(toListingProjection).filter(...)
  : []
```

`components/FeaturedSlider.tsx:55-60` unconditionally does:

```ts
const formattedSlides = propiedades.map((propiedad) => ({
  sourceUrl: urlForFeatured(propiedad.coverImage),
  thumbUrl: urlForThumbnail(propiedad.coverImage),
  title: propiedad.coverImage.asset?._ref,
}))
```

At the planned commit, `urlForFeatured(undefined)` throws `Unable to resolve image URL from source (undefined)`. `lib/property-projection.ts` is the documented normalization seam and `tests/property-projection.test.ts` is the exemplar.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Projection tests | `node_modules/.bin/tsx tests/property-projection.test.ts` | all pass |
| Adapter tests | `node_modules/.bin/tsx tests/sanity-client.test.ts` | featured malformed records dropped |
| Full gates | `yarn verify && yarn build` | exit 0 |

## Scope

**In scope**:
- `lib/property-projection.ts`
- `lib/interfaces.ts`
- `lib/sanity.client.ts`
- `tests/property-projection.test.ts`
- `tests/sanity-client.test.ts`
- `components/FeaturedSlider.tsx` only for resulting type/import cleanup

**Out of scope**:
- Adding placeholder images
- Changing Sanity schema validation
- Redesigning the carousel
- Altering featured count/order/query
- Optimizing `next/image` behavior

## Git workflow

- Branch: `advisor/007-validate-featured`
- Commit: `fix: validate featured properties`
- Do not push unless instructed.

## Steps

### Step 1: Define a featured projection

In `lib/property-projection.ts`, add a `FeaturedPropertyProjection` with the fields actually consumed by the slider: title, slug, cover image, type label, and operation label. Make the cover image required in the projected type.

Add `toFeaturedProjection(raw): FeaturedPropertyProjection | null` and optionally a bulk helper. Require non-empty title/slug and a resolvable image-shaped value. Normalize missing labels to empty strings only if the UI already tolerates them; do not accept a missing cover image.

If the old `Featured` interface in `lib/interfaces.ts` becomes redundant, replace its uses and remove it. Avoid duplicate competing types.

**Verify**: `yarn type-check` → exit 0 after type updates.

### Step 2: Add projection tests

Extend `tests/property-projection.test.ts` with:

- Full valid featured record.
- Null/undefined/non-object input.
- Missing title.
- Missing slug.
- Missing/null cover image.
- Valid image with missing optional asset ref if the image builder accepts it; otherwise reject it explicitly.
- Bulk helper drops only invalid entries while retaining order.

**Verify**: `node_modules/.bin/tsx tests/property-projection.test.ts` → all pass.

### Step 3: Normalize in `getFrontPage`

Treat `raw.featured` as unknown data. Map through the new projection and filter nulls before returning. Keep the current latest projection path and front-page cache policy unchanged.

Update Plan 004's adapter test to assert that one malformed featured record is dropped and valid neighbors remain in order.

**Verify**: `node_modules/.bin/tsx tests/sanity-client.test.ts` → all pass.

### Step 4: Keep slider assumptions explicit

`FeaturedSlider` should receive only `FeaturedPropertyProjection[]`; no fallback URL building or placeholder behavior is needed. Remove redundant checks that are provably impossible under the new type only if doing so improves clarity and does not alter rendering.

**Verify**: `yarn type-check && yarn lint` → exit 0.

### Step 5: Run full gates

**Verify**: `yarn verify && yarn build` → exit 0; homepage route generation succeeds.

## Test plan

Follow existing projection test structure. The regression assertion is that a front-page response containing a featured record without `coverImage` returns no such record to the slider and does not invoke an image URL builder during tests.

## Done criteria

- [ ] Featured records cross a typed projection boundary.
- [ ] Projected cover image is required.
- [ ] Incomplete featured records are dropped before UI rendering.
- [ ] Valid records retain order and labels.
- [ ] Focused tests, `yarn verify`, and `yarn build` pass.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- Sanity image validity cannot be determined without invoking the URL builder/network.
- Product intent requires rendering incomplete featured records with a placeholder; that is a separate design decision.
- The front-page query shape changed after planning.
- A solution requires broad carousel refactoring.

## Maintenance notes

CMS data is untrusted at runtime even when TypeScript casts say otherwise. Future front-page fields should be added to the projection and its tests before the slider consumes them.
