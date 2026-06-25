/**
 * Pure cache policy helpers for Sanity data fetching.
 * No Sanity client dependency – testable without mocks.
 *
 * Policies match ISR revalidate times and on-demand revalidation tags
 * used across the app. Tag strings come from `lib/content-freshness.ts`
 * so the fetch side and the revalidation side cannot drift.
 */

import {
  CONTENT_TAGS,
  getFilterDropdownTags,
  getFrontPageTags,
  getPageTags,
  getPropertyDetailTags,
  getPropiedadesListingTags,
} from './content-freshness'
import { hasActiveFilters } from './property-search'

/** Cache option shape accepted by `client.fetch()` (next-sanity / @sanity/client) */
export type CacheOptions = {
  cache?: 'force-cache' | 'no-store'
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

/** Named content policy */
export type ContentPolicy = {
  /** Revalidate interval in seconds (false = infinity) */
  revalidate: number | false
  /** Tags for on-demand revalidation */
  tags: string[]
}

/** Named policies for each content category. */
export const CONTENT_POLICIES: Record<string, ContentPolicy> = {
  'front-page': { revalidate: 86400, tags: getFrontPageTags() },
  filters: { revalidate: 86400, tags: getFilterDropdownTags() },
  propiedades: { revalidate: 86400, tags: getPropiedadesListingTags() },
  pages: { revalidate: 86400, tags: getPageTags() },
} as const

/** Build a CacheOptions from a named policy */
export function getCacheOptions(policy: ContentPolicy): CacheOptions {
  return {
    next: {
      revalidate: policy.revalidate,
      tags: [...policy.tags],
    },
  }
}

/** Convenience: get CacheOptions for a named policy key */
export function getPolicyOptions(policyName: string): CacheOptions {
  const policy = CONTENT_POLICIES[policyName]
  if (!policy) {
    throw new Error(`Unknown cache policy: "${policyName}"`)
  }
  return getCacheOptions(policy)
}

/**
 * Determine cache options for the propiedades listing page.
 *
 * - If the user hasn't applied any filters → cache aggressively (86400 s, tag `propiedades`)
 * - If the user has applied filters → no-store (avoid caching arbitrary filter combos)
 */
export function getSearchListingOptions(
  searchParams: Record<string, string | string[] | undefined> | undefined
): CacheOptions {
  if (!searchParams) {
    return getPolicyOptions('propiedades')
  }

  if (hasActiveFilters(searchParams)) {
    return { cache: 'no-store' }
  }

  return getPolicyOptions('propiedades')
}

/** Build CacheOptions for a single property detail page. */
export function getPropertyDetailOptions(slug: string): CacheOptions {
  return {
    next: {
      revalidate: 86400,
      tags: getPropertyDetailTags(slug),
    },
  }
}

// Re-export the tag vocabulary so existing imports keep working.
export { CONTENT_TAGS }
