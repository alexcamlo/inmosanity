# Keep property titles as language-neutral codes

- **Status:** Accepted — no migration
- **Decision date:** 2026-07-13
- **Decision owner:** Product
- **Implementation status:** Complete; no schema, query, content, or UI migration is required

## Decision

Property `title` values are inventory codes, not user-facing prose. The same code is intentionally used in Spanish and English. Keep `title` as the existing required scalar string and do not add localized title fields.

Specifically:

- Do not add `displayTitle`, `{es, en}`, or an internationalized title array.
- Do not translate, backfill, or otherwise mutate existing title values.
- Do not change GROQ title projection or TypeScript title shapes.
- Do not change existing `slug.current` values or slug-generation behavior.
- Metadata, image alternative text, email subjects, and WhatsApp messages may continue to include the same property code in either locale.

This decision supersedes the earlier proposal to localize property titles.

## Rationale

A localized field would imply that the value carries language-specific meaning. These values identify inventory and are intentionally stable across locales. Localizing them would add schema, query, editor, migration, fallback, testing, and rollback complexity without improving the displayed information.

Descriptions, operation labels, property types, locations, characteristics, and interface copy remain localized through their existing fields. Their localization does not make the property code itself translatable.

## Content inventory

The anonymous, read-only aggregate query run during the spike returned only these counts:

| Count | Value |
|---|---:|
| `totalPublished` | 13 |
| `usableTitles` | 13 |
| `missingTitles` | 0 |
| `slugged` | 13 |
| `distinctSlugs` | 13 |

The inventory confirms complete scalar-code and slug coverage for the published documents examined at the decision date. No content records, titles, slugs, IDs, credentials, or environment values were copied into this document.

## Affected contracts that remain unchanged

| Area | Exact file and symbol | Decision consequence |
|---|---|---|
| Studio field | `lib/sanity_schemas/propiedad.tsx:propiedad.fields[name="title"]` | Keep the required scalar string |
| Slug generation | `lib/sanity_schemas/propiedad.tsx:propiedad.fields[name="slug"].options.source` | Keep using scalar `title`; never regenerate an existing slug |
| Studio preview | `lib/sanity_schemas/propiedad.tsx:propiedad.preview` | Continue showing the code |
| Shared/featured GROQ | `lib/sanity.queries.ts:PROPIEDAD_FIELDS` and `frontPageQuery.featured` | Continue projecting scalar `title` without locale fallback |
| Legacy interface | `lib/interfaces.ts:Propiedad.title` | Remain `string` while the interface exists |
| Runtime projections | `lib/property-projection.ts:FeaturedPropertyProjection`, `PropertyListingProjection`, and `PropertyDetailProjection` | Continue requiring a non-empty scalar string |
| Projection normalizers | `lib/property-projection.ts:toFeaturedProjection`, `toListingProjection`, and `toDetailProjection` | Continue rejecting missing or malformed codes |
| Detail heading | `app/(frontend)/[lang]/propiedad/[slug]/page.tsx:Propiedad` | Display the same code in either locale |
| Metadata | `lib/site-metadata.ts:getPropertyMetadata` | Use the same code in either locale; canonical and alternate URLs remain locale-specific |
| Contact links | `app/(frontend)/[lang]/propiedad/[slug]/page.tsx:Propiedad` and `lib/contact-links.ts:buildWhatsAppPropertyUrl` | Include the same code in localized surrounding copy |
| Static URLs | `generateStaticParams`, `app/sitemap.ts:sitemap`, and `lib/site-routes.ts` | Continue using stable slugs, independent of locale |
| Tests | Projection, adapter, metadata, and contact-link test suites | Keep scalar-title/code expectations; no localized-title fixtures are needed |

## Rejected alternatives

The spike evaluated replacing `title` with an `{es, en}` object, adding a localized `displayTitle`, and adopting an internationalized-array/plugin representation. All three are rejected because they model a language-specific display value that the product does not have.

The additive `displayTitle` option would have been the safest migration if titles were prose, but the product clarification removes the underlying requirement. No migration phase, fallback GROQ, translation workflow, publication validation, or rollback procedure should be implemented.

## Invariants and acceptance checks

1. `title` remains a non-empty scalar code in schema, GROQ, and runtime projections.
2. Spanish and English routes may display the identical code.
3. Existing `slug.current` values remain unchanged.
4. Localized descriptions and reference labels continue using their existing localization behavior.
5. No title migration or content mutation is scheduled.
6. Existing projection, metadata, contact-link, route, and sitemap tests remain the regression coverage.

## Revisit criteria

Reopen this decision only if product introduces a separate human-readable property name that genuinely varies by language. That would be a new field and a new requirement; it must not silently change the meaning of the existing inventory code.
