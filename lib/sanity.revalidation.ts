/**
 * Pure helper for mapping Sanity webhook document types
 * to cache tags for on-demand ISR revalidation.
 *
 * No Sanity or Next.js dependency — testable without mocks.
 */

/** Shape expected from a Sanity webhook document body */
export type WebhookBody = {
  _type: string
  slug?: { current?: string } | null
}

/** Accepted document types */
export const ACCEPTED_DOCUMENT_TYPES = [
  'propiedad',
  'paginas',
  'operacion',
  'tipo',
  'localizacion',
] as const

export type AcceptedDocumentType = (typeof ACCEPTED_DOCUMENT_TYPES)[number]

/**
 * Map a Sanity webhook document to the cache tags that should be purged.
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
      const tags: string[] = ['propiedades', 'front-page', 'filters']
      if (doc.slug?.current) {
        tags.push(`propiedad:${doc.slug.current}`)
      }
      return tags
    }
    case 'paginas':
      return ['pages']
    case 'operacion':
    case 'tipo':
    case 'localizacion':
      return ['filters', 'propiedades', 'front-page']
    default:
      throw new Error(`Unknown document type: "${doc._type}"`)
  }
}
