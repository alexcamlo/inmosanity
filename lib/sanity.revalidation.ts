/**
 * Backwards-compatible re-export for the content freshness helpers.
 *
 * The mapping logic and tag vocabulary now live in
 * `lib/content-freshness.ts`. This module keeps the original import
 * surface (`getRevalidationTags`, `ACCEPTED_DOCUMENT_TYPES`, type
 * names) so existing call sites and tests continue to work.
 */

export {
  ACCEPTED_DOCUMENT_TYPES,
  getRevalidationTags,
  propiedadSlugTag,
} from './content-freshness'
export type { AcceptedDocumentType, WebhookBody } from './content-freshness'
