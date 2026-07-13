# Plan 008: Add route-specific canonical and localized SEO metadata

> **Executor instructions**: Implement metadata through small pure builders and route adapters. Do not hardcode a root canonical on child routes or invent CMS fields. Update the index when complete.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- app/'(frontend)'/'[lang]'/layout.tsx app/'(frontend)'/'[lang]'/page.tsx app/'(frontend)'/'[lang]'/propiedades/page.tsx app/'(frontend)'/'[lang]'/propiedad/'[slug]'/page.tsx app/'(frontend)'/'[lang]'/'[slug]'/page.tsx app/sitemap.ts lib/site-routes.ts lib/site-metadata.ts tests/site-metadata.test.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/003-canonicalize-locale-urls.md`, `plans/005-return-property-404.md`
- **Category**: bug / docs
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The locale layout currently gives every page the homepage canonical URL and language alternates. Built property pages therefore identify `https://inmogolfbonalba.com/` as canonical and use the generic site title, collapsing distinct inventory pages for search engines. The sitemap also reports the build time as `lastModified` for every URL, even when content did not change.

## Current state

`app/(frontend)/[lang]/layout.tsx:19-39` exports global metadata:

```ts
export const metadata: Metadata = {
  title: 'Inmogolf Bonalba',
  keywords: [...],
  alternates: {
    canonical: 'https://inmogolfbonalba.com/',
    languages: {
      en: 'https://inmogolfbonalba.com/en',
      es: 'https://inmogolfbonalba.com/es',
    },
  },
}
```

The property detail route fetches title/slug but exports no `generateMetadata`. The planned build produced a property HTML document with generic title and root canonical. `app/sitemap.ts:10-26` sets `new Date().toISOString()` for every property/static route.

Conventions:
- Absolute site URLs belong in `lib/site-routes.ts` (`SITE_URL`, property/static URL helpers).
- Locales are `es` and `en` from `i18n-config.ts`.
- Home already has localized title/description logic in `app/(frontend)/[lang]/page.tsx:10-34`.
- Do not add generated Sanity types; that remains documented out of scope.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Metadata tests | `node_modules/.bin/tsx tests/site-metadata.test.ts` | all pass |
| Full gates | `yarn verify && yarn build` | exit 0 |
| Built integration | `node scripts/verify-built-metadata.mjs` | prints `Built metadata OK` |

## Scope

**In scope**:
- `app/(frontend)/[lang]/layout.tsx`
- `app/(frontend)/[lang]/page.tsx`
- `app/(frontend)/[lang]/propiedades/page.tsx`
- `app/(frontend)/[lang]/propiedad/[slug]/page.tsx`
- `app/(frontend)/[lang]/[slug]/page.tsx`
- `app/sitemap.ts`
- `lib/site-routes.ts`
- `lib/site-metadata.ts` (create)
- `tests/site-metadata.test.ts` (create)
- `scripts/verify-built-metadata.mjs` (create)
- `tests/site-routes.test.ts` if helper coverage expands

**Out of scope**:
- Schema/content migrations
- Localizing property titles (Plan 014)
- Analytics, structured data, or a full SEO redesign
- Fabricating update timestamps
- Indexing draft content

## Git workflow

- Branch: `advisor/008-route-seo-metadata`
- Commit: `feat: add route-specific metadata`
- Do not push unless instructed.

## Steps

### Step 1: Define pure URL/metadata builders

Create `lib/site-metadata.ts` with pure functions for:

- Locale homepage metadata.
- Property listing metadata.
- Property detail metadata from locale plus an existing `PropertyDetailProjection`.
- Legal-notice metadata.
- Canonical and language-alternate URL maps using `lib/site-routes.ts`.

Return Next `Metadata`-compatible values, but keep builders free of data fetching. Use localized fixed copy for home/list/legal. For a property, use its existing title and location/type for a concise description; do not invent missing content.

Use one explicit title contract throughout:

- The locale layout owns `title.default = 'InmoGolf Bonalba'` and `title.template = 'InmoGolf Bonalba | %s'`.
- Child route builders return an unsuffixed route title such as the property title or localized “Properties”; they never append/prepend the brand.
- If the localized home title is already a complete branded phrase, return it as `title.absolute` so the layout template is not applied twice.

**Verify**: `yarn type-check` → exit 0.

### Step 2: Add metadata tests

Create `tests/site-metadata.test.ts` using `node:assert/strict`. Cover both locales and assert:

- Each route has its own canonical URL.
- Property canonical includes locale and slug.
- `en`/`es` alternate URLs point to equivalent routes.
- Listing canonical excludes arbitrary search parameters.
- Property builder returns the raw property title with no `InmoGolf Bonalba` substring; the built page contains the brand exactly once through the layout template.
- No child-route canonical equals the bare site root.

**Verify**: focused test passes.

### Step 3: Narrow layout metadata

Keep only truly global defaults in the locale layout: title template/default, metadata base if useful, keywords, and other invariant values. Remove route-specific canonical/language values from the layout.

Use route `generateMetadata` functions that delegate to the pure builders. Reuse the fetched property for metadata through the same cached adapter; do not introduce a raw `client.fetch` in the route. If the property is missing, return safe minimal metadata and allow the page's `notFound()` to determine the response.

**Verify**: `yarn type-check && yarn lint` → exit 0.

### Step 4: Correct sitemap freshness claims

Remove `lastModified` fields based on `new Date()` unless a real `_updatedAt` value is added to the existing slug projection with tests. Prefer omission in this plan: it is more accurate than claiming every URL changed at build time.

Keep the fixed URL joining from Plan 003.

**Verify**:

```bash
if rg -q 'new Date\(\)\.toISOString' app/sitemap.ts; then
  echo 'Fabricated sitemap timestamp remains'
  exit 1
fi
echo 'Sitemap has no build-time timestamp'
```

Expected: prints `Sitemap has no build-time timestamp` and exits 0.

### Step 5: Add a machine-checkable built-output gate

Create `scripts/verify-built-metadata.mjs`. It must use Node standard-library filesystem/path APIs and assertions to inspect build output after `yarn build`:

1. Read `.next/server/app/en.html` and `.next/server/app/es.html`; assert each canonical equals `https://inmogolfbonalba.com/<locale>` with at most the chosen trailing slash.
2. Read each locale's `aviso-legal.html`; assert its canonical equals `https://inmogolfbonalba.com/<locale>/aviso-legal` and contains no locale double slash.
3. Discover at least one `.next/server/app/<locale>/propiedad/*.html`; derive locale/slug from its path and assert canonical equals that exact public route.
4. Assert the discovered property's `<title>` is not the generic `Inmogolf Bonalba`/`InmoGolf Bonalba` title and contains the brand exactly once.
5. Read `.next/server/app/sitemap.xml.body`; assert it has no `<lastmod>` when no real CMS timestamp was added and no `/en//` or `/es//` location.
6. Fail with a specific assertion if any required artifact is missing; print `Built metadata OK` only after all assertions pass.

**Verify**:

```bash
yarn build
node scripts/verify-built-metadata.mjs
```

Expected: prints `Built metadata OK` and exits 0.

## Test plan

Pure tests cover route builders, title-template contract, and both locales. `scripts/verify-built-metadata.mjs` is the mandatory integration gate for Next metadata merging and generated sitemap output. Use `tests/site-routes.test.ts` as unit-test style guidance.

## Done criteria

- [ ] No child route inherits the root-site canonical.
- [ ] Home, listing, legal, and property routes have localized canonical/alternate URLs.
- [ ] Property pages have route-specific titles.
- [ ] Sitemap does not fabricate modification times.
- [ ] Focused tests, `yarn verify`, and `yarn build` pass.
- [ ] `node scripts/verify-built-metadata.mjs` prints `Built metadata OK` after the build.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- Canonical host/domain differs from `SITE_URL` in production configuration.
- Metadata implementation requires new CMS fields or content migration.
- Next metadata merging differs after the framework patch and cannot be expressed through route builders.
- Property metadata causes an uncached duplicate network request that cannot reuse the existing cache policy.

## Maintenance notes

All new public routes need a metadata builder and canonical URL test. If real `_updatedAt` is later projected for sitemap entries, add it explicitly and test its source rather than restoring build-time timestamps.
