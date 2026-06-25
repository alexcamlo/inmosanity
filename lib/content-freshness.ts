/**
 * Single source of truth for content freshness.
 *
 * Owns:
 *   - the project's cache / revalidation tag vocabulary
 *   - tag construction helpers (e.g. `propiedad:<slug>`) so fetch
 *     sites and webhook revalidation cannot drift
 *   - the document-type → tag mapping used by the Sanity webhook
 *     revalidation route
 *
 * The fetcher (`lib/sanity.cache.ts`) and the revalidation webhook
 * helper (`lib/sanity.revalidation.ts`) both consume this module so
 * that tags used at fetch time and tags used at revalidation stay
 * aligned. Anything rendered on a Propiedad page should appear here.
 *
 * No Sanity / Next dependencies — testable without mocks.
 */

/** Tag vocabulary used by fetch cache options and `revalidateTag`. */
export const CONTENT_TAGS = {
  frontPage: 'front-page',
  filters: 'filters',
  propiedades: 'propiedades',
  pages: 'pages',
} as const

export type BaseContentTag = (typeof CONTENT_TAGS)[keyof typeof CONTENT_TAGS]
export type PropiedadContentTag = `propiedad:${string}`
export type ContentTag = BaseContentTag | PropiedadContentTag

/** Shape expected from a Sanity webhook document body. */
export type WebhookBody = {
  _type: string
  slug?: { current?: string } | null
}

/** Cache / revalidation tag for a single Propiedad detail page. */
export function propiedadSlugTag(slug: string): PropiedadContentTag {
  return `propiedad:${slug}`
}

/** Build the full tag list used when fetching a single Propiedad detail page. */
export function getPropertyDetailTags(slug: string): string[] {
  return [CONTENT_TAGS.propiedades, propiedadSlugTag(slug)]
}

/** Build the full tag list used when fetching the default Propiedad listing. */
export function getPropiedadesListingTags(): string[] {
  return [CONTENT_TAGS.propiedades]
}

/** Build the full tag list used when fetching the front page. */
export function getFrontPageTags(): string[] {
  return [CONTENT_TAGS.frontPage]
}

/** Build the full tag list used when fetching filter dropdowns. */
export function getFilterDropdownTags(): string[] {
  return [CONTENT_TAGS.filters]
}

/** Build the full tag list used when fetching `paginas` documents. */
export function getPageTags(): string[] {
  return [CONTENT_TAGS.pages]
}

/**
 * Map a Sanity webhook document to the cache tags that should be purged.
 *
 * Every document type referenced by a Propiedad page is included:
 *   - `propiedad` itself            → listing + front-page + filters + detail slug
 *   - `operacion`, `tipo`, `localizacion` → listing, filter dropdowns, front-page
 *   - `caracteristicas`             → listing (detail pages render feature lists)
 *   - `paginas`                     → static `paginas` routes
 *
 * @param doc - Webhook body (or any object with `_type` and optional `slug`).
 * @returns Array of cache-tag strings.
 * @throws {Error} If `_type` is missing or not one of the accepted types.
 */
export function getRevalidationTags(doc: WebhookBody): string[] {
  if (!doc || !doc._type) {
    throw new Error('Missing _type in webhook document')
  }

  switch (doc._type) {
    case 'propiedad': {
      const tags: ContentTag[] = [
        CONTENT_TAGS.propiedades,
        CONTENT_TAGS.frontPage,
        CONTENT_TAGS.filters,
      ]
      if (doc.slug?.current) {
        tags.push(propiedadSlugTag(doc.slug.current))
      }
      return tags
    }
    case 'operacion':
    case 'tipo':
    case 'localizacion':
      return [
        CONTENT_TAGS.filters,
        CONTENT_TAGS.propiedades,
        CONTENT_TAGS.frontPage,
      ]
    case 'caracteristicas':
      // Detail pages render feature lists. A change to any feature
      // invalidates the listing (which may include the detail in
      // "latest" or "featured" grids) and the per-detail page tag.
      // Webhook payload does not include reverse references, so we
      // conservatively invalidate the listing tag only.
      return [CONTENT_TAGS.propiedades]
    case 'paginas':
      return [CONTENT_TAGS.pages]
    default:
      throw new Error(`Unknown document type: "${doc._type}"`)
  }
}

/** Accepted Sanity document types for content freshness revalidation. */
export const ACCEPTED_DOCUMENT_TYPES = [
  'propiedad',
  'paginas',
  'operacion',
  'tipo',
  'localizacion',
  'caracteristicas',
] as const

export type AcceptedDocumentType = (typeof ACCEPTED_DOCUMENT_TYPES)[number]
