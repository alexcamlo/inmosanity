# Plan 011: Remove superseded GROQ query exports

> **Executor instructions**: Prove every target export has no consumer before deletion. This is dead-code removal only; do not rewrite active queries. Update the index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- lib/sanity.queries.ts lib/sanity.client.ts tests/sanity-cache.test.ts tests/sanity-client.test.ts`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/004-test-framework-boundaries.md`
- **Category**: tech-debt
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The query catalog still exports a backup slug query, an obsolete all-in-one search query, and individual dropdown/stat queries superseded by `filtersDropdownQuery`. Multiple apparent implementations make future maintainers likely to update dead code or reintroduce the old multi-request path. Removing confirmed-unused exports leaves one authoritative query per adapter.

## Current state

`lib/sanity.queries.ts` currently contains:

- `searchPropiedades` at lines 36-41 — replaced by dynamic query construction in `lib/property-search.ts`.
- `propiedadSlugsQueryBak` at lines 43-45 — backup of the active draft-filtered query.
- `operacionDD`, `tipoDD`, `localizacionDDBak`, `localizacionDD`, `maxPriceSaleDD`, `maxPriceRentDD`, `bathroomsDD`, `bedroomsDD`, and `total` at lines 75-141.
- Active `filtersDropdownQuery` at lines 143-183 combines those filter values into one request.

`lib/sanity.client.ts` imports only active named queries including `filtersDropdownQuery`. Repository search found no consumers for the targets above.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Dead import gate | `if rg -q -U '(?s)import\s*\{[^}]*\b(searchPropiedades|propiedadSlugsQueryBak|operacionDD|tipoDD|localizacionDDBak|localizacionDD|maxPriceSaleDD|maxPriceRentDD|bathroomsDD|bedroomsDD|total)\b[^}]*\}\s*from\s*[^;\n]*sanity\.queries' app components lib tests --glob '!lib/sanity.queries.ts'; then exit 1; else echo 'No dead query imports'; fi` | prints `No dead query imports` |
| Focused tests | `node_modules/.bin/tsx tests/sanity-client.test.ts && node_modules/.bin/tsx tests/sanity-cache.test.ts` | all pass |
| Full gates | `yarn verify && yarn build` | exit 0 |

## Scope

**In scope**:
- `lib/sanity.queries.ts`
- Tests only if they explicitly catalog exports and need deletion updates

**Out of scope**:
- Reformatting or optimizing active GROQ
- Changing property projections/search semantics
- Removing `lib/sanity.revalidation.ts` compatibility exports
- Renaming active queries
- Schema changes

## Git workflow

- Branch: `advisor/011-remove-dead-groq`
- Commit: `refactor: remove superseded GROQ queries`
- Do not push unless instructed.

## Steps

### Step 1: Reconfirm no consumers

Run one multiline import-declaration gate that looks only inside named imports from `sanity.queries`, avoiding false positives from domain fields such as `filtersDD.total` or `operacionDD`:

```bash
if rg -q -U '(?s)import\s*\{[^}]*\b(searchPropiedades|propiedadSlugsQueryBak|operacionDD|tipoDD|localizacionDDBak|localizacionDD|maxPriceSaleDD|maxPriceRentDD|bathroomsDD|bedroomsDD|total)\b[^}]*\}\s*from\s*[^;\n]*sanity\.queries' app components lib tests --glob '!lib/sanity.queries.ts'; then
  echo 'A dead query export still has a consumer'
  exit 1
fi
echo 'No dead query imports'
```

Expected: prints `No dead query imports` and exits 0. If it fails, rerun the same `rg` without `-q` to identify the consumer, then STOP and report; do not alter the deletion set or continue with a partial plan.

### Step 2: Delete only dead exports

Remove the target declarations and their comments/blank space. Retain:

- `PROPIEDAD_FIELDS`
- `frontPageQuery`
- `propiedadSlugsQuery`
- `propiedadBySlugQuery`
- `pageSlugsQuery`
- `pageBySlugQuery`
- `filtersDropdownQuery`

Do not alter retained query text.

**Verify**: `git diff -- lib/sanity.queries.ts` shows deletions only outside retained query bodies.

### Step 3: Run focused and full gates

**Verify**:

```bash
node_modules/.bin/tsx tests/sanity-client.test.ts
node_modules/.bin/tsx tests/sanity-cache.test.ts
yarn verify
yarn build
```

Expected: all exit 0.

## Test plan

No new behavior test is required because this removes unreachable declarations. Existing adapter tests must prove active query identities and filter behavior still work. Use `rg` as the machine-checkable dead-symbol gate.

## Done criteria

- [ ] Every deleted export had zero source/test consumers.
- [ ] No `Bak` query export remains.
- [ ] Active query text is unchanged.
- [ ] Focused tests, `yarn verify`, and `yarn build` pass.
- [ ] Only `lib/sanity.queries.ts`, necessary test catalogs, and `plans/README.md` changed.

## STOP conditions

- A supposedly dead query has a live source/test consumer.
- A hosted/external integration imports this source module directly.
- Another plan has renamed or consolidated active queries.
- Tests fail in a way that indicates a deleted symbol was reachable.

## Maintenance notes

Do not keep backup queries in production source; Git history is the backup. Future query consolidation should delete superseded exports in the same change after consumer search.
