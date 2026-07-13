# Localized property titles

- **Status:** Proposed — product approval required before implementation
- **Decision type:** Schema and content migration design
- **Evidence date:** 2026-07-13
- **Implementation status:** Not started; this document authorizes no schema or content changes

## Context

Property descriptions, operation labels, type labels, and interface copy are localized, but a property's display title is currently one Spanish/source string. That scalar value flows through Studio, GROQ, projections, page metadata, image alternative text, contact links, and the detail heading. English routes can therefore show a Spanish title.

A title migration must not change public property URLs. Existing `slug.current` values are stable identifiers and are frozen throughout the proposed rollout.

## Decision

Recommend **Option 2: add `displayTitle: {es, en}` while retaining the existing scalar `title` field**.

The existing `title` remains the stable legacy/source value and continues to support the current slug configuration. The new field becomes the localized display source. During rollout, GROQ projects the localized value into the existing frontend `title: string` contract, falling back first to Spanish and then to legacy `title`. This separates a user-facing localization concern from a URL-generation dependency and permits an incremental, reversible migration.

This is a proposal, not approval to implement. Product decisions listed below must be resolved before the publication-validation phase.

## Content inventory

The prescribed anonymous, read-only aggregate query completed successfully. Only aggregate counts were returned.

| Count | Value |
|---|---:|
| `totalPublished` | 13 |
| `usableTitles` | 13 |
| `missingTitles` | 0 |
| `slugged` | 13 |
| `distinctSlugs` | 13 |

The counts show complete scalar-title and slug coverage in the currently published inventory, with no duplicate published slug values. They do not establish that English translations exist.

## Impact map

“Localized display” means the consumer should receive the locale-selected value. “Stable” means the consumer must remain independent of localized display changes.

| Area | Exact file and symbol | Current role | Migration treatment |
|---|---|---|---|
| Studio schema | `lib/sanity_schemas/propiedad.tsx:propiedad.fields[name="title"]` | Required scalar source title | Retain as legacy/source value; do not rename during rollout |
| Slug generation | `lib/sanity_schemas/propiedad.tsx:propiedad.fields[name="slug"].options.source` and `.slugify` | Derives new slugs from scalar `title` | Keep coupling until a separately approved slug policy exists; never regenerate an existing `slug.current` |
| Studio preview | `lib/sanity_schemas/propiedad.tsx:propiedad.preview.select` and `.prepare` | Uses scalar title as preview heading | Select localized Spanish display value with legacy fallback during mixed content |
| Shared GROQ projection | `lib/sanity.queries.ts:PROPIEDAD_FIELDS` | Projects scalar `title` for listing/detail data | Project locale-selected display value under the existing `title` key |
| Featured GROQ projection | `lib/sanity.queries.ts:frontPageQuery.featured` | Projects scalar title independently of the shared fragment | Apply the same locale fallback expression; preserve result order/count |
| Search query composition | `lib/property-search.ts:buildPropertySearchQuery` | Embeds `PROPIEDAD_FIELDS` in dynamic listing GROQ | No separate title rule; inherits the shared projection change |
| Projection types | `lib/property-projection.ts:FeaturedPropertyProjection`, `PropertyListingProjection`, and `PropertyDetailProjection` | Expose required `title: string` to the application | Keep the public field scalar during migration; GROQ owns locale selection |
| Legacy property interface | `lib/interfaces.ts:Propiedad.title` | Declares a required scalar `title: string` on the older `Propiedad` shape | Keep scalar-compatible while any consumer remains; do not repurpose it as a localized object. After migration, inventory consumers and retire this interface/field only in a separate cleanup if it is confirmed unused. |
| Projection normalization | `lib/property-projection.ts:toFeaturedProjection`, `toListingProjection`, and `toDetailProjection` | Reject missing/empty title values | Keep current required-string validation; add mixed old/new fallback fixtures |
| Sanity adapter | `lib/sanity.client.ts:createSanityDataAdapter.getFrontPage`, `.getSearchProperties`, and `.getPropiedadBySlug` | Passes locale to GROQ and returns projections | Preserve signatures, locale parameters, cache policies, and return shapes |
| Front-page slider | `components/FeaturedSlider.tsx:FeaturedSlider` | Uses title as main-image alternative text | Receive localized display title through the existing projection |
| Listing cards | `components/ui/PropiedadCard.tsx:PropiedadCard` | Uses title as card-image alternative text | Receive localized display title through the existing projection |
| Detail heading | `app/(frontend)/[lang]/propiedad/[slug]/page.tsx:Propiedad` | Renders `propiedad.title` in the page heading | Receive localized display title for the active route locale |
| Property metadata | `lib/site-metadata.ts:getPropertyMetadata` | Uses title for document title and description | Receive localized display title; preserve canonical and language alternates |
| Metadata route adapter | `app/(frontend)/[lang]/propiedad/[slug]/page.tsx:generateMetadata` | Fetches locale-specific property projection | Preserve adapter/cache behavior and missing-property metadata |
| Email enquiry | `app/(frontend)/[lang]/propiedad/[slug]/page.tsx:Propiedad` email subjects | Inserts title in desktop/mobile mail links | Use localized display title; preserve recipient and surrounding localized copy |
| WhatsApp helper | `lib/contact-links.ts:buildWhatsAppPropertyUrl` | Inserts supplied title in encoded message | Continue accepting a scalar; route supplies localized display title |
| WhatsApp route adapter | `app/(frontend)/[lang]/propiedad/[slug]/page.tsx:Propiedad` WhatsApp input | Supplies `propiedad.title` to both contact surfaces | No helper API change required |
| Static property paths | `app/(frontend)/[lang]/propiedad/[slug]/page.tsx:generateStaticParams` | Generates routes from slug projection only | Stable; must not depend on localized title |
| Sitemap | `app/sitemap.ts:sitemap` and `lib/sanity.client.ts:createSanityDataAdapter.getAllPropiedadesSlug` | Emit localized URLs from stable slugs | Stable; no title field needed |
| Projection tests | `tests/property-projection.test.ts` featured/listing/detail cases | Enforce non-empty scalar projected title | Add old-only, localized, empty-locale, and malformed localized-field cases |
| Adapter tests | `tests/sanity-client.test.ts` front-page/search/detail cases | Characterize locale/query parameters and projected title | Assert fallback output in both locales without changing fetch policies |
| Metadata tests | `tests/site-metadata.test.ts` property cases | Assert route title and description | Add Spanish/English localized title inputs and fallback behavior |
| Built metadata gate | `scripts/verify-built-metadata.mjs` property artifact assertions | Rejects a generic property title and checks title-template merging | Keep; verify each locale artifact contains its selected display title |
| Contact tests | `tests/contact-links.test.ts` localized-message cases | Assert exact decoded title/message text | Add route-level fixtures proving the selected locale title is supplied |
| Search/static tests | `tests/property-search.test.ts` and `tests/sanity-client.test.ts` slug cases | Protect shared query composition and stable slug projection | Assert query fallback text separately; keep slug expectations unchanged |

Generic reference fields such as operation, type, characteristic, and location titles are separate schemas and already use their own localization/fallback patterns. They must not be migrated as part of property-title work.

## Options considered

| Criterion | 1. Replace `title` with `{es, en}` | 2. Add `displayTitle`, retain `title` **(recommended)** | 3. Internationalized array/plugin |
|---|---|---|---|
| Editor experience | Familiar object fields, but changes the meaning/type of a required existing field immediately | Explicit localized display group beside a clearly labelled legacy/source field; can be introduced gradually | Potentially strong locale UI, but introduces a new representation and plugin conventions |
| Query fallback | Every consumer must handle scalar and object shapes during rollout | New display field can fall back to unchanged scalar field with one expression | Queries must search array entries and also fall back to the legacy scalar |
| Rollout compatibility | High risk: old and new records share one field with incompatible types | High: old records remain valid and frontend output stays scalar | Medium/low: adds dependency and a third localization shape to a codebase using objects |
| Slug impact | Existing `source: 'title'` no longer points to a string; requires immediate slug-source redesign | Existing slug source remains intact; all stored slugs can remain frozen | Requires a separate stable source for slugs and careful plugin-independent fallback |
| Metadata/contact impact | Consumers need coordinated object-to-string changes | No consumer API change if GROQ aliases localized output to `title` | Consumer API can stay scalar, but projection/query complexity increases |
| Migration complexity | Medium/high, with a risky mixed-type period | Medium, additive, observable, and reversible | High: dependency evaluation, array migration, editor training, and query changes |
| Rollback | Difficult after documents replace the scalar field | Straightforward: restore legacy projection and stop reading `displayTitle` | Requires retaining plugin and array data or migrating back |
| Fit with current architecture | Matches localized description shape eventually, but not safe incrementally | Matches existing localized-object convention while protecting stable identifiers | Weak unless additional locale-management needs justify the plugin |

### Why Option 2

Option 2 is the only additive choice that keeps the current slug source and every existing record valid throughout rollout. Its temporary field duplication is deliberate: `title` is an identity-adjacent legacy/source field, while `displayTitle` is presentation content. The cost is maintaining a fallback expression until translation completeness is proven. That cost is smaller and more reversible than a mixed scalar/object field or a new plugin representation.

## Target schema shape

Conceptual target only:

```text
property.title: string
  purpose: stable legacy/source title; retained during and after rollout

property.displayTitle: object
  displayTitle.es: string
  displayTitle.en: string
  purpose: localized user-facing title
```

Initial validation permits `displayTitle` to be absent so existing records remain publishable during backfill. Later validation rules may require language values for new publications after product approval and migration-completeness checks. The scalar `title` must not be silently overwritten when editors change a translation.

The Studio preview should prefer `displayTitle.es`, then legacy `title`, during mixed content. If Studio locale-aware preview is later required, that is a separate editor-experience enhancement; the initial preview remains deterministic.

## Backward-compatible GROQ contract

During migration, queries should continue returning a scalar field named `title`, so projection and UI types do not change. Empty strings require `select`, not only `coalesce`:

```groq
"title": select(
  defined(displayTitle[$lang]) && displayTitle[$lang] != "" => displayTitle[$lang],
  defined(displayTitle.es) && displayTitle.es != "" => displayTitle.es,
  title
)
```

Apply this expression both in `PROPIEDAD_FIELDS` and the featured projection. Spanish is the proposed authoritative fallback. The final legacy `title` arm remains until all required translations and rollback checkpoints are satisfied.

This expression is backward-compatible for the schema-conforming states expected during migration: missing fields, empty strings, and non-empty strings. It does **not** make malformed object/array/number values safe: a defined non-empty non-string candidate can satisfy the GROQ condition. Projection normalization therefore remains the runtime type boundary and must accept only non-empty strings. If the selected alias is non-string or empty, the record is rejected; the implementation must not claim that this GROQ expression falls through to legacy text for malformed values. If product later requires malformed localized values to recover to legacy text instead of dropping the record, project localized, Spanish, and legacy candidates separately and choose the first non-empty string in the normalizer, with explicit mixed/malformed fixtures.

## Slug invariants

1. Every existing `slug.current` is frozen permanently by this migration.
2. Backfill must never write, regenerate, normalize, or compare-and-replace a slug.
3. Localized title edits never trigger slug updates.
4. Spanish and English routes continue sharing the same slug.
5. Any future change to slug source or localized slugs requires a separate decision covering redirects, sitemap behavior, canonicals, and external links.

## Migration phases

### Phase 0 — Approve product rules

Resolve the open decisions below. Capture an inventory snapshot and establish rollback ownership. No schema or content mutation begins before approval.

**Checkpoint:** product and content owners approve fallback, translation ownership, and publication requirements.

### Phase 1 — Additive schema and compatibility query

Add optional `displayTitle.es` and `displayTitle.en`. Update Studio preview with Spanish/legacy fallback. Change both property GROQ projection sites to alias the selected string as `title`. Keep all TypeScript projection contracts scalar.

**Checkpoint:** schema validation and old-only/mixed/new-only query fixtures pass; existing route and sitemap snapshots show identical slugs.

### Phase 2 — Backfill Spanish without fabricating English

Prepare a separately reviewed, dry-run-capable migration. Copy each legacy scalar source into `displayTitle.es` only when the Spanish display value is empty. Never touch `slug.current`. Do not machine-translate or copy Spanish into persisted English content unless product explicitly approves that content policy.

**Checkpoint:** aggregate completeness report shows Spanish coverage, unchanged slug set/count, and no overwritten non-empty display values. Review a small editorial sample in Studio without publishing automated changes blindly.

### Phase 3 — Editorial English translation

A named content owner translates existing inventory into `displayTitle.en`. English routes may use the runtime Spanish fallback only if the temporary fallback decision is approved. Translation is editorial work; punctuation, property terminology, and claims require human review.

**Checkpoint:** content owner signs off English completeness and quality; both locale routes, metadata, email, and WhatsApp show the expected language.

### Phase 4 — Tighten publication validation

After existing inventory is complete, require the approved language set for newly published properties. Keep legacy `title` stable. If Studio supports document-level validation by publication state, use that pattern; do not block drafts needed for translation workflow.

**Checkpoint:** editors can save incomplete drafts, cannot publish contrary to the approved rule, and preview fallback remains intelligible.

### Phase 5 — Retire runtime legacy fallback only after an observation window

Monitor content and rendering for an agreed window. The legacy fallback may be removed from display queries only when completeness checks, acceptance tests, and rollback approval all pass. Retaining the scalar field for stable source/audit purposes is acceptable even after it is no longer displayed.

**Checkpoint:** no fallback hits in the observation window, no slug drift, and product signs off removal.

## Rollback

Rollback is intentionally query-first and non-destructive:

1. Restore the projection to legacy scalar `title` while leaving additive `displayTitle` data untouched.
2. Revert stricter publication validation so editors are not blocked.
3. Keep every existing slug unchanged.
4. Re-run route, metadata, contact, and sitemap tests against legacy output.
5. Diagnose content/query issues before attempting a revised rollout.

Do not delete localized values during rollback. Because Option 2 is additive, retaining them allows correction without data loss. Any backfill implementation must produce an aggregate dry-run report and a separately stored operational rollback procedure before execution.

## Acceptance tests

A future implementation plan must add or update tests for:

1. **Schema validation:** old records remain valid during the additive phase; approved language requirements apply only at the intended publication checkpoint.
2. **GROQ fallback:** Spanish localized value wins on Spanish routes; English localized value wins on English routes; missing/empty English falls back to Spanish; missing localized object falls back to legacy scalar; malformed values never become non-string projections.
3. **Featured query parity:** featured and shared property fields use the identical fallback order.
4. **Projection behavior:** listing, featured, and detail projections still require one non-empty scalar display title and retain current public types.
5. **Rendering:** detail heading and both image-alt consumers receive the selected locale title.
6. **Stable slugs:** pre/post slug arrays are identical; `generateStaticParams`, sitemap URLs, canonicals, and locale alternates do not change.
7. **Metadata:** property document title and description use the selected locale title exactly once with the site template.
8. **Contact links:** desktop/mobile email subjects and the decoded WhatsApp message contain the selected locale title and unchanged canonical URL.
9. **Mixed content:** old-only, partially backfilled, fully translated, empty-string, and invalid localized-field fixtures behave according to fallback policy.
10. **Rollback:** switching the query back to legacy output restores prior titles without data or URL changes.

## Open product decisions

| Question | Proposed status | Required owner/action |
|---|---|---|
| Is Spanish the authoritative fallback? | **Recommended: yes; unresolved pending product approval.** It matches current source content and existing reference-field conventions. | Product owner confirms before Phase 1. |
| May English temporarily fall back to Spanish? | **Recommended: yes during migration; unresolved pending product approval.** This avoids blank titles but preserves the visible mixed-language limitation until translation completes. | Product owner sets an end date/quality threshold. |
| Who owns translation of existing inventory? | **Unresolved.** No automatic translation is approved by this decision. | Assign a content owner and review workflow before Phase 3. |
| Must new documents require both languages before publication? | **Recommended: yes after backfill; unresolved pending workflow approval.** Drafts should remain saveable while incomplete. | Product/content owners define the publication gate. |
| Should generic reference fields remain language maps as today? | **UNRESOLVED — technical owner confirmation required. Recommended: yes.** No migration need was identified for operation/type/characteristic/location labels. | Technical owner confirms they remain out of scope before Phase 1. |

## Implementation gate

No implementation or content migration may start from this document alone. After product decisions are resolved, create a separate implementation and migration plan against the then-current schema and dependency versions. That plan must include dry-run evidence, exact mutation scope, reviewer approval, staged deployment, and rollback ownership. Live preview remains disabled and Sanity types remain handwritten unless separately approved.
