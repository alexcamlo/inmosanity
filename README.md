# Inmogolf Bonalba

A real-estate site for the Bonalba Golf Club area (Mutxamel, Alicante). The
frontend is built with the **Next.js App Router**; the content lives in a
**Sanity Studio** hosted at `https://inmogolfbonalba.sanity.studio/`; the public app redirects `/studio` there.

> The README used to describe an older starter layout (`/pages`, `/api/preview`,
> preview embeds). It now describes the App Router + Sanity 5 + React 19 stack
> that the repo actually uses. For the module-by-module architecture, see
> [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Stack

- Next.js 16 (App Router, async `params` / `searchParams`)
- React 19
- Sanity 5 (`next-sanity` 12, `@sanity/client` 7)
- TypeScript 5
- Tailwind CSS 3
- Plain Node tests run through `tsx` (no Jest / Vitest)

## Local setup

The app reads Sanity credentials from environment variables. For local
development, copy `.env.local.example` (when present) or pull the project's
environment into `.env.local`.

```bash
yarn install
yarn dev
```

- App: <http://localhost:3000>
- Sanity Studio: <https://inmogolfbonalba.sanity.studio/> (`/studio` redirects there)

## Project layout

```
app/                  App Router routes
  (frontend)/[lang]/  Locale-scoped pages (es, en)
  api/revalidate/     Sanity webhook → Next cache revalidation
  sitemap.ts          Sitemap
  robots.ts           robots.txt
components/           Shared React components (Header, Hero, filters, …)
components/ui/        Radix-backed primitives (Button, Dialog, Select, …)
dictionaries/         Per-locale UI strings (en.json, es.json)
lib/                  Data + behavior modules (see ARCHITECTURE.md)
  sanity.client.ts    Frontend route data fetcher (`client.fetch` for app routes)
  sanity.queries.ts   GROQ queries and field fragments
  sanity.cache.ts     Cache policies (pure helpers)
  content-freshness.ts Tag vocabulary and webhook document mapping
  sanity.revalidation.ts  Backwards-compatible re-export of `content-freshness`
  sanity.image.ts     Image URL builder + named size variants
  property-search.ts  Normalized search criteria + GROQ fragment
  property-projection.ts Listing / detail / slug projection shapes
  property-presentation.ts  Shared display rules (card + detail)
  sanity_schemas/     Sanity Studio document schemas
sanity.config.ts      Sanity Studio configuration
sanity.cli.ts         Sanity CLI configuration (used for deploy/import)
proxy.ts              i18n locale redirect (renamed from `middleware.ts`)
styles/               Global styles
tests/                Plain Node tests, run with `tsx`
```

## Validation commands

Run these from the repo root. Each command is independent; the order is the
recommended sequence (fastest → slowest).

```bash
# Plain Node tests (lib + content-freshness + image + property modules)
node_modules/.bin/tsx tests/sanity-cache.test.ts
node_modules/.bin/tsx tests/sanity-revalidation.test.ts
node_modules/.bin/tsx tests/content-freshness.test.ts
node_modules/.bin/tsx tests/sanity-image.test.ts
node_modules/.bin/tsx tests/image-config.test.ts
node_modules/.bin/tsx tests/property-search.test.ts
node_modules/.bin/tsx tests/property-projection.test.ts
node_modules/.bin/tsx tests/property-presentation.test.ts
node_modules/.bin/tsx tests/site-routes.test.ts

# TypeScript (no emit)
yarn type-check

# ESLint
yarn lint

# Prettier (writes changes)
yarn format

# Production build
yarn build

# Run the production build
yarn start
```

`yarn lint:fix` runs `format` and ESLint autofixes in sequence.

## Where to look next

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — modules, seams, cache /
  revalidation model, projection shapes, presentation rules.
- [docs/UPGRADE_PATH.md](./docs/UPGRADE_PATH.md) — historical record of the
  Next 14 + Sanity 3 → Next 16 + Sanity 5 upgrade phases. Useful for context
  on the current stack, not an active runbook.
- [docs/studio-preview.md](./docs/studio-preview.md) — live preview is not
  currently active; the document now describes how content freshness
  actually works.

## Deployment

The app is designed to deploy to Vercel. Sanity webhook URLs point at
`/api/revalidate` on the production domain and are signed with
`SANITY_REVALIDATE_SECRET`.
