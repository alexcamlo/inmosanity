# Plan 003: Canonicalize locale redirects and generated site URLs

> **Executor instructions**: Follow all steps and add regression tests before changing production URL construction. Update the plan index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- proxy.ts lib/site-routes.ts app/sitemap.ts tests/site-routes.test.ts tests/proxy.test.ts`
> A mismatch in current URL construction is a STOP condition until reconciled.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-add-verification-baseline.md`
- **Category**: bug
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

Every unlocalized request currently gets a double-slash locale path, and query parameters are discarded because `Object.entries()` cannot enumerate `URLSearchParams`. The sitemap helper independently emits double slashes for routes passed with a leading slash, and the current unit test asserts that malformed output. Shared/search URLs can therefore lose filters, incur extra redirects, or advertise non-canonical URLs to crawlers.

## Current state

`proxy.ts:29-39` rebuilds a query incorrectly:

```ts
const searchParams = request.nextUrl.searchParams
const newSearchParams = new URLSearchParams()
const createQueryString = (searchParams: object) => {
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== '') newSearchParams.set(key, value)
  }
  return newSearchParams.toString()
}
```

`proxy.ts:75-82` prepends a slash to a pathname that already starts with one:

```ts
new URL(`/${locale}/${pathname}?${createQueryString(searchParams)}`, request.url)
```

A direct check at the planned commit returned:

```text
https://example.com/ => https://example.com/es//?
https://example.com/propiedades?operacion=x => https://example.com/es//propiedades?
```

`lib/site-routes.ts:12-14` uses `` `${SITE_URL}/${locale}/${route}` ``, while `tests/site-routes.test.ts:13-19` expects `https://inmogolfbonalba.com/en//aviso-legal`.

Conventions: keep locale values from `i18n-config.ts`; preserve the current `SITE_URL` helper boundary; use plain Node `assert` tests.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `node_modules/.bin/tsx tests/proxy.test.ts && node_modules/.bin/tsx tests/site-routes.test.ts` | all cases pass |
| Full verification | `yarn verify` | exit 0 |
| Build | `yarn build` | exit 0 |

## Scope

**In scope**:
- `proxy.ts`
- `lib/site-routes.ts`
- `tests/proxy.test.ts` (create)
- `tests/site-routes.test.ts`
- `app/sitemap.ts` only if call-site normalization is required

**Out of scope**:
- Changing supported locales or locale negotiation
- Removing the intentional `/studio` bypass
- SEO title/canonical metadata (Plan 008)
- Reworking public assets beyond what is necessary for redirect tests
- Changing filter vocabulary

## Git workflow

- Branch: `advisor/003-canonicalize-locale-urls`
- Commit: `fix: preserve locale redirect URLs`
- Do not push unless instructed.

## Steps

### Step 1: Add failing redirect tests

Create `tests/proxy.test.ts`. Construct `NextRequest` instances and call exported `proxy`. Cover:

1. `/` with Spanish negotiation → one canonical locale path, no empty `?`.
2. `/propiedades?operacion=operacion-en-alquiler&tipo=tipo-todos` → both parameters preserved exactly once.
3. An already localized `/en/propiedades?...` → Proxy returns no redirect.
4. `/studio` → still bypassed.
5. Query values containing spaces or non-ASCII text remain URL-encoded and round-trip through `URL`.

Do not compare raw query ordering unless ordering is part of the input contract; compare parsed `searchParams`.

**Verify before fix**: focused proxy test fails on cases 1 and 2 for the expected reasons.

### Step 2: Replace manual redirect assembly

Clone `request.nextUrl`, assign a pathname formed as `/${locale}${pathname}` (with one separator), and leave the cloned URL's existing `searchParams` untouched. Return `NextResponse.redirect(url)`. Remove the dead `newSearchParams`, `createQueryString`, and always-truthy ternary.

Preserve the Studio bypass and matcher semantics.

**Verify**: `node_modules/.bin/tsx tests/proxy.test.ts` → all cases pass.

### Step 3: Normalize static route joining

Make `getStaticPageUrl` accept both `''` and routes with or without leading slashes without ever producing `//` after the hostname. Preserve the locale-home trailing-slash convention already used by the sitemap unless the current Next configuration demonstrably canonicalizes it differently.

Update `tests/site-routes.test.ts` so legal-notice output is `https://inmogolfbonalba.com/en/aviso-legal`. Add cases for `''`, `'aviso-legal'`, and `'/aviso-legal'`.

**Verify**: `node_modules/.bin/tsx tests/site-routes.test.ts` → all cases pass and no expected URL contains `//` beyond `https://`.

### Step 4: Verify generated sitemap output

Run a production build, then inspect `.next/server/app/sitemap.xml.body` without committing it.

**Verify**:

```bash
yarn build
if rg -q '<loc>https://inmogolfbonalba.com/(es|en)//' .next/server/app/sitemap.xml.body; then
  echo 'Malformed locale URL remains in sitemap'
  exit 1
fi
echo 'Sitemap locale URLs are canonical'
```

Expected: build exits 0, the block prints `Sitemap locale URLs are canonical`, and the block exits 0.

## Test plan

Model both test files after existing `tests/site-routes.test.ts` using `node:assert/strict`. Tests must cover root, nested path, already-localized path, multi-parameter query, encoded query, Studio bypass, and route helper leading-slash normalization.

## Done criteria

- [ ] `/` redirects to one locale path with no double slash or empty `?`.
- [ ] Unlocalized query parameters survive redirect unchanged.
- [ ] Already-localized and Studio paths still bypass locale redirect.
- [ ] Sitemap contains no `/es//` or `/en//` URLs.
- [ ] Focused tests, `yarn verify`, and `yarn build` pass.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- Next 16.2 changed `NextRequest.nextUrl` cloning or Proxy return semantics.
- Fixing this requires changing supported locale behavior.
- The production domain or trailing-slash policy has changed since planning.
- Tests require a live server rather than direct Proxy invocation.

## Maintenance notes

All absolute public URLs should continue to flow through `lib/site-routes.ts`. Reviewers should reject new string concatenation that accepts an ambiguous leading slash without normalization.
