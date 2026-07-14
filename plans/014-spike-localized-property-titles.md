# Plan 014: Confirm property titles remain language-neutral codes

> **Final product decision (2026-07-13):** Property titles are inventory codes and are intentionally identical across languages. No localized-title schema or content migration is needed. This decision supersedes the migration proposal produced during the initial spike.
>
> **Executor instructions:** Record the no-migration decision and its consequences. Do not modify schemas, queries, content, or production code.
>
> **Drift check:** `git diff --stat b0275ac..HEAD -- lib/sanity_schemas/propiedad.tsx lib/sanity.queries.ts lib/property-projection.ts app/'(frontend)'/'[lang]'/propiedad/'[slug]'/page.tsx docs/decisions/localized-property-titles.md`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (decision record only)
- **Depends on**: `plans/008-add-route-seo-metadata.md`, `plans/012-add-contextual-whatsapp-links.md`
- **Category**: direction
- **Outcome**: DONE — retain scalar language-neutral title codes; no migration
- **Planned at**: commit `b0275ac`, 2026-07-13

## Why this matters

The original audit treated property titles as Spanish prose and proposed investigating localization. Product clarified that the values are inventory codes, not translatable display names. Recording that distinction prevents unnecessary schema fields, content backfills, fallback GROQ, translation work, and slug risk.

## Current state

- `lib/sanity_schemas/propiedad.tsx` defines `title` as a required scalar string.
- GROQ and runtime projections expose scalar `title`.
- Metadata, headings, alternative text, and contact links may show the same code in either locale.
- Existing slugs are stable and remain unchanged.
- Descriptions, reference labels, and interface copy continue to use their existing localization fields.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Decision record | `test -s docs/decisions/localized-property-titles.md` | exit 0 |
| No migration artifacts | `git diff --name-only HEAD^ | rg '^(lib/sanity_schemas|lib/sanity\.queries|lib/property-projection)'` | no matches |
| Verification | `yarn verify` | exit 0 |

## Scope

**In scope**:
- `docs/decisions/localized-property-titles.md`
- This plan and `plans/README.md` to reflect the final product decision

**Out of scope**:
- Schema, query, projection, UI, or content changes
- Adding localized title fields
- Translating or backfilling title values
- Changing or regenerating slugs
- Deploying Studio or mutating Sanity content

## Git workflow

- Branch: `advisor/014-localized-title-spike`
- Corrective commit: `docs: record title code decision`
- Do not push unless instructed.

## Steps

### Step 1: Record the final decision

State that `title` is a language-neutral inventory code and remains a required scalar string. Explicitly reject `displayTitle`, `{es, en}`, and internationalized-array/plugin migrations.

**Verify**: the decision record says “Accepted — no migration.”

### Step 2: Preserve stable contracts

Document that schema, GROQ, projection types, metadata, contact links, Studio preview, and existing slugs remain unchanged. Localized surrounding copy may continue to include the same code.

**Verify**: the decision record lists the unchanged consumer contracts and stable-slug invariant.

### Step 3: Close migration work

Remove proposed migration phases, fallback queries, translation ownership, publication-language gates, and rollback tasks. They are unnecessary because there is no translatable title field.

**Verify**: no localized-title implementation follow-up remains in the decision record or plan index.

## Test plan

No application tests change because application behavior does not change. Existing projection, adapter, metadata, contact-link, route, and sitemap tests continue to protect scalar codes and stable URLs. Run `yarn verify` after the documentation correction.

## Done criteria

- [x] Product decision is recorded as no migration.
- [x] `title` remains a scalar language-neutral code.
- [x] Existing slugs remain unchanged.
- [x] No schema, query, projection, content, or UI change is proposed.
- [x] Decision record and plan index no longer describe localized-title work as a follow-up.
- [x] Only documentation files changed.

## STOP conditions

- A future requirement introduces a separate human-readable name that genuinely varies by locale.
- Any proposed correction would mutate content, schema, queries, or slugs.

## Maintenance notes

Reopen this decision only for a new language-dependent display-name requirement. Do not reinterpret the existing property code as translatable prose.
