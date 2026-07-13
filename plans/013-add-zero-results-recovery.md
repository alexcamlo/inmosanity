# Plan 013: Add a localized zero-results recovery state

> **Executor instructions**: Reuse the URL-driven search model and existing design tokens. Do not add client state or duplicate filter logic. Update the index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- app/'(frontend)'/'[lang]'/propiedades/page.tsx components/EmptyPropertyResults.tsx lib/search-results-state.ts lib/interfaces.ts dictionaries/en.json dictionaries/es.json tests/property-results-state.test.ts tests/property-search.test.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/006-align-default-property-search.md`
- **Category**: direction
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

An over-constrained search currently renders “0 results” and an empty grid with no path forward. The route already knows the locale and uses URL-driven filters, so a clear-filters action can recover users immediately with little complexity. This is a presentation improvement, not a search-semantics change.

## Current state

`app/(frontend)/[lang]/propiedades/page.tsx:40-60` always renders the result count and grid:

```tsx
<h2>{propiedades.length} ...</h2>
<div className={clsx('grid grid-cols-cards gap-4', ...)}>
  {propiedades.map((propiedad) => <PropiedadCard ... />)}
</div>
```

When the array is empty, there is no explanatory copy or reset link. Locale copy lives in `dictionaries/en.json`/`es.json`, with its shape manually represented by `Dict` in `lib/interfaces.ts`. Plan 006 establishes the canonical default sale criteria.

UI conventions: use `next/link`, existing green/zinc Tailwind tokens, rounded controls, visible focus state, and a minimum comfortable touch target. Match nearby error/404 action styling rather than introducing a new component library.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Search tests | `node_modules/.bin/tsx tests/property-search.test.ts` | default sale serialization passes |
| Feature test | `node_modules/.bin/tsx tests/property-results-state.test.ts` | empty/results branches and reset link pass |
| Full gates | `yarn verify && yarn build` | exit 0 |

## Scope

**In scope**:
- `app/(frontend)/[lang]/propiedades/page.tsx`
- `components/EmptyPropertyResults.tsx` (create)
- `lib/search-results-state.ts` (create)
- `tests/property-results-state.test.ts` (create)
- `lib/interfaces.ts`
- `dictionaries/en.json`
- `dictionaries/es.json`

**Out of scope**:
- Search query/filter behavior
- Suggestions/recommendation algorithms
- Pagination
- Changing filter dialog/desktop filter components
- Adding analytics

## Git workflow

- Branch: `advisor/013-zero-results-state`
- Commit: `feat: add search recovery state`
- Do not push unless instructed.

## Steps

### Step 1: Add localized empty-state copy

Add dictionary fields for a zero-results heading, a short suggestion to broaden/reset filters, and a clear-filters action. Update `Dict` exactly once so both locale files remain aligned.

**Verify**: `yarn type-check` → exit 0.

### Step 2: Define and test the result-state contract

Create `lib/search-results-state.ts` with a pure function accepting result count and locale. Return a discriminated union:

- `{ kind: 'empty', resetHref: string }` for count `0`.
- `{ kind: 'results' }` for count greater than `0`.

Build `resetHref` from Plan 006's shared default search criteria/serializer, not a copied operation ID. It must contain no type, location, price, room, or unknown parameters.

Create `components/EmptyPropertyResults.tsx` as a presentational Server Component accepting the three localized copy strings and `resetHref`. It renders semantic heading/paragraph/`Link`, uses existing green/zinc/radius tokens, and includes a visible `focus-visible` style.

Create `tests/property-results-state.test.ts`. Use `node:assert/strict` for state assertions and `react-dom/server` with `React.createElement` (the test remains `.ts`, not `.tsx`) to render the empty component. Assert:

1. Count 0 returns `kind: 'empty'` and a reset URL with only the default operation if Plan 006 serializes it explicitly.
2. Counts 1 and greater return `kind: 'results'` and no reset URL.
3. Rendered empty HTML contains heading, message, action label, expected `href`, and a focus-visible class.
4. Parsed reset URL has none of `tipo`, `localizacion`, `precioMin`, `precioMax`, `banos`, or `habitaciones`.

**Verify**: `node_modules/.bin/tsx tests/property-results-state.test.ts` → all assertions pass.

### Step 3: Render the tested conditional state

In the route, derive the state once from `propiedades.length`. When `state.kind === 'empty'`, render `EmptyPropertyResults` instead of the grid. When `state.kind === 'results'`, preserve the current count/cards/layout exactly. Do not add client state.

**Verify**: `yarn lint && yarn type-check` → exit 0, and `rg -n "state\.kind === 'empty'|EmptyPropertyResults" 'app/(frontend)/[lang]/propiedades/page.tsx'` shows the route uses the tested branch/component.

### Step 4: Run mandatory feature and build gates

```bash
node_modules/.bin/tsx tests/property-results-state.test.ts
yarn verify
yarn build
```

Expected: all commands exit 0. Browser automation may supplement these gates but is not a substitute for the mandatory feature test.

## Test plan

- Existing property-search tests prove the reset/default URL means sale.
- New state tests cover zero and non-zero counts and removal of every active filter key.
- Server-rendered component test asserts localized copy, reset href, and focus-visible class.
- Optional browser smoke may confirm navigation and visual focus, but machine-checkable tests are mandatory.

## Done criteria

- [ ] Empty result arrays show localized recovery UI.
- [ ] Reset removes every active filter and returns to default sale inventory.
- [ ] Non-empty rendering is unchanged.
- [ ] Link is keyboard accessible with visible focus, covered by rendered-markup assertion.
- [ ] `tests/property-results-state.test.ts`, `yarn verify`, and `yarn build` pass.
- [ ] Only in-scope files and `plans/README.md` changed.

## STOP conditions

- Product wants recommended listings instead of a reset action.
- Plan 006 did not establish a deterministic default search.
- Adding the state requires client-side URL state.
- Locale dictionary shape has changed after planning.

## Maintenance notes

If pagination is later added, distinguish “no matches” from “page beyond range.” Keep recovery copy in dictionaries and reset semantics in the shared search module.
