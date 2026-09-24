import type { Locale } from '@/i18n-config'

import {
  DEFAULT_SEARCH_CRITERIA,
  serializeSearchCriteria,
} from './property-search'

export type PropertyResultsState =
  | { kind: 'empty'; resetHref: string }
  | { kind: 'results' }

export function getPropertyResultsState(
  resultCount: number,
  locale: Locale
): PropertyResultsState {
  if (!Number.isInteger(resultCount) || resultCount < 0) {
    throw new RangeError('resultCount must be a non-negative integer')
  }

  if (resultCount !== 0) return { kind: 'results' }

  const search = serializeSearchCriteria(DEFAULT_SEARCH_CRITERIA)
  return {
    kind: 'empty',
    resetHref: `/${locale}/propiedades?${search}`,
  }
}
