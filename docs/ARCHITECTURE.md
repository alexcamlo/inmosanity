# Architecture

This document describes the current shape of the app: the App Router layout,
the Sanity Studio mounting, the data / cache / revalidation seams, and the
projection / presentation rules. Module names in backticks are the
authoritative interface; specific filenames are illustrative.

The aim is for new work to start from the description here, not from the
old starter README.

## Routing — App Router

The app uses the Next.js 16 App Router with a single locale-scoped segment:

```
app/
  (frontend)/
    [lang]/
      layout.tsx                 Root layout: <html>, fonts, header, footer
      page.tsx                   Front page (hero + featured + latest)
      not-found.tsx              404 inside a locale
      error.tsx                  Route error boundary
      [slug]/page.tsx            CMS pages (`paginas` documents)
      propiedad/[slug]/page.tsx  Single property detail
      propiedades/
        layout.tsx               Suspense wrapper for listing page
        page.tsx                 Filtered listing; renders FilterBar, desktop filters, and results
  api/
    revalidate/route.ts          Sanity webhook → Next cache revalidation
  global-error.tsx               Top-level error boundary
  robots.ts                      /robots.txt
  sitemap.ts                     /sitemap.xml
```

`proxy.ts` (formerly `middleware.ts`) is responsible for the i18n locale
redirect at the edge. The supported locales are declared in `i18n-config.ts`
and resolved from `dictionaries/<locale>.json`.

All routes consume the data layer through `lib/sanity.client.ts`. Routes
do not call `client.fetch()` directly, and they do not import
`next-sanity` outside of the data and Studio layers.

## Sanity Studio

The public app redirects `/studio` to the hosted Sanity Studio at `https://inmogolfbonalba.sanity.studio/`:

- `sanity.config.ts` — `defineConfig({ basePath: '/studio', projectId,
dataset, schema, plugins: [structureTool(...), visionTool(...)] })`.
- `lib/sanity.schema.js` — composes the document schemas from
  `lib/sanity_schemas/*.tsx`.
- `lib/sanity.structure.js` — custom Studio structure (grouped property
  lists, parent/child navigation for `localizacion`).
- `sanity.cli.ts` — used for `sanity deploy` and other CLI operations.

`next.config.mjs` owns the `/studio/:path*` redirect. `basePath: '/studio'` configures the Studio project for Sanity tooling; it is not an App Router route in this repo.

### Live preview

The app does not currently run the `IFramePreviewView` from the original
starter. Content freshness is driven by the Sanity webhook → `/api/revalidate`
flow described below. See [docs/studio-preview.md](./studio-preview.md) for
the historical reference and the path to re-enable it.

## Data layer

The frontend route data layer talks to Sanity's GROQ endpoint through `lib/sanity.client.ts`. Studio-only validation also uses Sanity's client in the slug uniqueness helper. The route-facing seams are:

- `lib/sanity.client.ts` — `createClient(...)` from `next-sanity` and the
  exported async getters (`getFrontPage`, `getFiltersDropdownValues`,
  `getSearchProperties`, `getPropiedadBySlug`, `getAllPropiedadesSlug`,
  `getPageBySlug`, `getAllPagesSlug`). Each getter takes a typed
  `Locale` / slug / search params argument and returns a typed value.
- `lib/sanity.queries.ts` — GROQ queries and shared field fragments
  (`PROPIEDAD_FIELDS`, `frontPageQuery`, `filtersDropdownQuery`,
  `propiedadBySlugQuery`, `propiedadSlugsQuery`, `pageBySlugQuery`,
  `pageSlugsQuery`). Routes never inline GROQ.

### Propiedad projection shapes

Raw GROQ records are normalized into typed shapes before reaching the UI.
The three projections, all from `lib/property-projection.ts`, are:

- `PropertyListingProjection` — consumed by `PropiedadCard` and the front
  page's "latest" grid.
- `PropertyDetailProjection` — consumed by the detail page; extends the
  listing projection with `images`, `caracteristicas`, and `description`.
- `PropertySlugProjection` — returned by `getAllPropiedadesSlug`; route static params and sitemap URLs consume `slug.slug`.

The mapping functions are `toListingProjection(raw)`,
`toDetailProjection(raw)`, and `toSlugProjection(raw)`. They return `null`
when identity fields are missing so the caller can decide what to do.

Regression fences: `LISTING_PROJECTION_KEYS`, `DETAIL_PROJECTION_KEYS`,
and `SLUG_PROJECTION_KEYS` are exported tuples. If a key is renamed or
removed intentionally, update the tuple and the projection type together;
the projection tests assert the tuple's contents.

## Propiedad search module

`lib/property-search.ts` owns the vocabulary and the GROQ fragment for
listing searches. It is consumed by the data adapter, the filter UI
(`components/ui/filters.tsx`), the hero search (`components/Hero.tsx`),
and the listing route.

- `PropertySearchCriteria` — the normalized shape (operacion, tipo,
  localizacion, precioMin / precioMax, banos, habitaciones). Unknown URL keys are ignored intentionally.
- `parseSearchParams(params)` — raw URL/search params → criteria. Numeric
  filters are coerced; non-numeric values drop to `undefined`.
- `serializeSearchCriteria(criteria)` — criteria → URL search-param string.
- `buildPropertySearchGroq(criteria)` — returns the GROQ fragment that
  applies criteria to the listing query, with sentinel "all" values
  (`LOCATION_ALL`, `TIPO_ALL`) handled explicitly.
- `buildPropertySearchQuery(criteria)` — returns `{ query, params }` for
  the Sanity client. The adapter adds `lang` to the params at call time.
- `hasActiveFilters(params)` — `true` when known params represent a filter beyond the default sale view.

Sentinel values (`localizacion-todas`, `tipo-todos`, `operacion-en-venta`,
`operacion-en-alquiler`) live in this module so the UI and the adapter
agree on the string vocabulary.

## Cache and content freshness

The cache / revalidation model is split into two pure modules plus one
route:

- `lib/sanity.cache.ts` — `CONTENT_POLICIES` (`front-page`, `filters`,
  `propiedades`, `pages`), `getCacheOptions(policy)`,
  `getPolicyOptions(name)`, `getSearchListingOptions(searchParams)` (cached
  for empty search, `no-store` for filtered search), and
  `getPropertyDetailOptions(slug)`.
- `lib/content-freshness.ts` — single source of truth for the tag
  vocabulary (`CONTENT_TAGS`) and the webhook document → tag mapping
  (`getRevalidationTags`). Fetch sites and the webhook route both consume
  this module so the tags used at fetch time and at invalidation time
  cannot drift.
- `app/api/revalidate/route.ts` — `POST` handler. Verifies the Sanity
  webhook signature with `parseBody` from `next-sanity/webhook`, calls
  `getRevalidationTags`, and `revalidateTag`s each one.

`lib/sanity.revalidation.ts` re-exports the content-freshness helpers
(`getRevalidationTags`, `ACCEPTED_DOCUMENT_TYPES`, types) for backwards
compatibility. New code should import from `lib/content-freshness.ts`.

Accepted document types for the webhook: `propiedad`, `paginas`,
`operacion`, `tipo`, `localizacion`, `caracteristicas`. The mapping
includes `caracteristicas` because the detail page renders feature
lists, and a taxonomy change can affect the listing tag.

## Property presentation

`lib/property-presentation.ts` owns the shared display decisions for the
`Propiedad` card and detail views:

- `formatPropertyPrice(price)` — locale-formatted EUR price.
- `getRentSuffix(propiedad, scope, dict)` — returns `null` for non-rentals.
  Card uses `dict.alquiler_tag`; detail uses `/mes`. The two scopes share
  the same scope decision (rent or not); only the suffix text differs.
- `getPropertyLocationDisplay(propiedad)` — splits location into the
  parent label (when present) and the child label. The fallback rule is
  shared: the parent is shown as `<parent> - ` only when its title is
  non-empty.
- `getPropertyFacts(propiedad, scope)` — which of `bedrooms`, `bathrooms`,
  `size`, `year` are shown, with a `unit` for `size`. The card drops `0`
  bedrooms; the detail page keeps them. `size` and `year` are only shown
  when positive in both views.
- `describeProperty(propiedad, scope, dict)` — bundle of the three
  decisions for a single render site.

`PROPERTY_FACT_KEYS` is an exported tuple used as a regression fence.

## Image layer

`lib/sanity.image.ts` builds Sanity image URLs and exposes named size
variants (`urlForThumbnail`, `urlForCard`, `urlForFeatured`,
`urlForDetail`, `urlForModal`). UI components consume these variants so
call sites do not duplicate width / quality / fit numbers.

## i18n

- `i18n-config.ts` declares the supported locales.
- `dictionaries/<locale>.json` carries the UI strings. `get-dictionary.ts`
  resolves the active dictionary from `params.lang`.
- Routes always `await props.params` and treat `params.lang` as the source
  of truth. Locale is forwarded into GROQ queries through the
  `lang` parameter.
- `proxy.ts` is responsible for the locale redirect at the edge.

## Seams at a glance

| Concern            | Module                             | Adapters consumed                        |
| ------------------ | ---------------------------------- | ---------------------------------------- |
| Routing            | `app/`                             | Next.js App Router                       |
| Studio             | `sanity.config.ts`, `lib/sanity_*` | Sanity Studio                            |
| Data fetching      | `lib/sanity.client.ts`             | `next-sanity` client                     |
| GROQ               | `lib/sanity.queries.ts`            | Sanity Content Lake                      |
| Cache policies     | `lib/sanity.cache.ts`              | `next/cache`                             |
| Tag vocabulary     | `lib/content-freshness.ts`         | `lib/sanity.cache.ts`, `/api/revalidate` |
| Webhook            | `app/api/revalidate/route.ts`      | `next-sanity/webhook`                    |
| Image URLs         | `lib/sanity.image.ts`              | `@sanity/image-url`                      |
| Search criteria    | `lib/property-search.ts`           | `next-sanity` GROQ, `URLSearchParams`    |
| Projection shapes  | `lib/property-projection.ts`       | UI components, sitemap                   |
| Presentation rules | `lib/property-presentation.ts`     | UI components                            |
| i18n               | `i18n-config.ts`, `dictionaries/`  | App Router routes, `proxy.ts`            |

## Validation commands

The repo does not use Jest or Vitest. Tests are plain Node scripts run
through `tsx`. There is no `test` script in `package.json`; the canonical
way to run a single test is `node_modules/.bin/tsx <path>`. The full set:

```bash
node_modules/.bin/tsx tests/sanity-cache.test.ts
node_modules/.bin/tsx tests/sanity-revalidation.test.ts
node_modules/.bin/tsx tests/content-freshness.test.ts
node_modules/.bin/tsx tests/sanity-image.test.ts
node_modules/.bin/tsx tests/image-config.test.ts
node_modules/.bin/tsx tests/property-search.test.ts
node_modules/.bin/tsx tests/property-projection.test.ts
node_modules/.bin/tsx tests/property-presentation.test.ts
node_modules/.bin/tsx tests/site-routes.test.ts
```

Other validation:

```bash
yarn type-check     # tsc --noEmit
yarn lint           # eslint .
yarn format         # prettier --write .
yarn build          # next build
yarn start          # next start (after build)
```

`yarn lint:fix` runs `format` and ESLint autofixes in sequence.

## Out of scope

- Live preview (`IFramePreviewView`). Not wired up; content freshness
  uses the webhook flow above. See [docs/studio-preview.md](./studio-preview.md).
- Automated E2E (Playwright) setup. The upgrade plan includes an example
  Playwright test, but the suite is not committed.
- Generated Sanity types. The projections and the search criteria are
  hand-typed; introducing generated types is a separate decision.
