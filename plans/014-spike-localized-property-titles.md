# Plan 014: Decide a safe migration path for localized property titles

> **Executor instructions**: This is a design/data spike. Do not modify schemas, queries, content, or production code. Produce the decision document and evidence requested below, then stop. Update the plan index when done.
>
> **Drift check (run first)**: `git diff --stat b0275ac..HEAD -- lib/sanity_schemas/propiedad.tsx lib/sanity.queries.ts lib/property-projection.ts app/'(frontend)'/'[lang]'/propiedad/'[slug]'/page.tsx docs/decisions/localized-property-titles.md`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (spike only)
- **Depends on**: `plans/008-add-route-seo-metadata.md`, `plans/012-add-contextual-whatsapp-links.md`
- **Category**: direction
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The site is bilingual and localizes property descriptions, operation/type labels, and UI, but every property title is one scalar string. English pages and enquiries can therefore mix translated content with a Spanish headline. Changing title shape affects Studio editing, GROQ projections, static metadata, slug generation, and existing content, so the correct next step is a documented migration decision rather than an immediate schema edit.

## Current state

- `lib/sanity_schemas/propiedad.tsx:14-18` defines `title` as required `string`.
- `lib/sanity_schemas/propiedad.tsx:96-113` defines `description` as an object with `es` and `en` text fields.
- The slug field at lines 19-36 derives from scalar `title`; existing public URLs must not change.
- `lib/sanity.queries.ts:4-18` projects scalar `title`, while operation/type labels already use locale fallback.
- `lib/property-projection.ts:40-54` requires a scalar string title for listing/detail projections.
- Plan 008 uses title in route metadata, and Plan 012 uses it in enquiry context.
- Architecture constraints: preserve existing slugs; no live preview or generated Sanity types are assumed.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Source inventory | `rg -n '\btitle\b' lib/sanity_schemas/propiedad.tsx lib/sanity.queries.ts lib/property-projection.ts app components` | complete impact list |
| Slug inventory | `rg -n 'slug|source: .title.' lib/sanity_schemas/propiedad.tsx lib/sanity.queries.ts` | current coupling identified |
| Doc check | `test -s docs/decisions/localized-property-titles.md` | exit 0 |

## Scope

**In scope**:
- `docs/decisions/localized-property-titles.md` (create)
- Read-only inspection of schema/query/projection/UI and, if authorized, read-only aggregate content queries

**Out of scope**:
- Any source/schema/query change
- Any Sanity content mutation or migration execution
- Changing or regenerating slugs
- Deploying Studio
- Enabling live preview or generated types
- Copying property content into the document beyond non-sensitive aggregate counts/examples

## Git workflow

- Branch: `advisor/014-localized-title-spike`
- Commit: `docs: design localized property titles`
- Do not push unless instructed.

## Steps

### Step 1: Map every title consumer

Inventory scalar title usage across:

- Studio schema/preview and slug generation.
- GROQ query fragments and front-page featured shape.
- Listing/detail projections.
- Cards, sliders, detail heading, metadata, email, and WhatsApp.
- Tests and sitemap/static generation.

Record exact `file:symbol` references in the decision document. Separate places that need localized display from stable identifiers that must remain unchanged.

**Verify**: document contains an “Impact map” table with schema, query, projection, UI, metadata, contact, and tests rows.

### Step 2: Measure content migration shape through an anonymous aggregate query

Use only the Sanity CLI's read-only `documents query` command with `--anonymous`. Do not remove `--anonymous`, do not supply a token, and do not run `documents create/delete`, `migration run`, `dataset`, `deploy`, or `exec`.

Run this exact aggregate query, which returns counts only and no document content:

```bash
yarn sanity documents query --anonymous --api-version 2023-01-01 '{
  "totalPublished": count(*[_type == "propiedad" && !(_id in path("drafts.**"))]),
  "usableTitles": count(*[_type == "propiedad" && !(_id in path("drafts.**")) && defined(title) && title != ""]),
  "missingTitles": count(*[_type == "propiedad" && !(_id in path("drafts.**")) && (!defined(title) || title == "")]),
  "slugged": count(*[_type == "propiedad" && !(_id in path("drafts.**")) && defined(slug.current)]),
  "distinctSlugs": count(array::unique(*[_type == "propiedad" && !(_id in path("drafts.**")) && defined(slug.current)].slug.current))
}'
```

Record only the five aggregate numbers in the decision document. Because the current schema proves title is scalar, `usableTitles` is the scalar-title count. If anonymous access fails, do not retry with credentials: record all five values as `UNKNOWN`, copy the exact aggregate query (not environment/config values) into a “Maintainer follow-up” subsection, and continue the spike.

**Verify**: the document's “Content inventory” contains exactly these five count names with numeric values or `UNKNOWN`; it contains no titles, slugs, document IDs, environment values, or credential instructions.

### Step 3: Compare migration options

Evaluate at least:

1. Replace `title: string` with `{es, en}` directly.
2. Add localized `displayTitle` while retaining legacy `title` as stable Spanish/source text.
3. Use Sanity internationalized-array/plugin patterns.

For each, document editor UX, query fallback, rollout compatibility, slug impact, metadata/contact impact, migration complexity, and rollback. Respect the existing simple localized object pattern unless a plugin provides concrete value.

**Verify**: document contains a comparison table with all criteria and one recommended option.

### Step 4: Specify a staged migration without executing it

The recommendation must include:

- Target schema shape and field naming.
- Backward-compatible GROQ `select`/`coalesce` fallback during migration.
- Projection type transition.
- Content backfill strategy (Spanish from legacy title; English requires editorial translation, not automatic fabrication unless product approves it).
- Explicit rule that existing slug values are frozen.
- Studio preview behavior during mixed old/new content.
- Test cases and rollout/rollback checkpoints.

Do not include executable mutation credentials or run a migration.

**Verify**: document has “Migration phases”, “Rollback”, and “Acceptance tests” sections.

### Step 5: Record open product decisions

At minimum answer or flag:

- Is Spanish the authoritative fallback?
- May English temporarily fall back to Spanish?
- Who owns translation of existing inventory?
- Must new documents require both languages before publication?
- Should generic reference fields remain language maps as today?

**Verify**: document has a decision/status for each question and clearly labels unresolved items.

## Test plan

No application tests are changed in this spike. The decision document must list future tests for schema validation, GROQ fallback for old/new/mixed records, projection behavior, title rendering in both locales, stable slugs, metadata, and contact links.

## Done criteria

- [ ] Only `docs/decisions/localized-property-titles.md` and `plans/README.md` changed.
- [ ] Impact map covers every title consumer.
- [ ] Three migration options are compared.
- [ ] One option is recommended with trade-offs.
- [ ] Existing slugs are explicitly preserved.
- [ ] Staged rollout, rollback, tests, content inventory, and open decisions are documented.
- [ ] No source/schema/content mutation occurred.

## STOP conditions

- Any command would mutate Sanity content or deploy Studio.
- The current schema no longer uses scalar title.
- Product has already recorded a conflicting title-localization decision.
- An environment value or content record would need to be copied into the document.

## Maintenance notes

After maintainers approve the decision, write a separate implementation/migration plan against the then-current commit. Do not turn this spike branch directly into a schema migration without that review gate.
