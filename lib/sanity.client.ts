import { Locale } from '@/i18n-config'
import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId, useCdn } from './env'
import { FiltersDD, FrontPage } from './interfaces'
import {
  buildPropertySearchQuery,
  parseSearchParams,
} from './property-search'
import {
  toDetailProjection,
  toListingProjection,
  toSlugProjections,
} from './property-projection'
import {
  getPolicyOptions,
  getPropertyDetailOptions,
  getSearchListingOptions,
} from './sanity.cache'
import {
  filtersDropdownQuery,
  frontPageQuery,
  pageBySlugQuery,
  pageSlugsQuery,
  propiedadBySlugQuery,
  propiedadSlugsQuery,
} from './sanity.queries'
import type {
  PropertyDetailProjection,
  PropertyListingProjection,
  PropertySlugProjection,
} from './property-projection'

export const client = createClient({ apiVersion, dataset, projectId, useCdn })

export async function getFrontPage(lang: Locale): Promise<FrontPage> {
  if (client) {
    const raw = (await client.fetch(
      frontPageQuery,
      { lang },
      getPolicyOptions('front-page')
    )) as { featured?: FrontPage['featured']; latest?: unknown[] } | null
    const featured = Array.isArray(raw?.featured) ? raw.featured : []
    const latest = Array.isArray(raw?.latest)
      ? raw.latest
          .map((r) => toListingProjection(r as Parameters<typeof toListingProjection>[0]))
          .filter((p): p is PropertyListingProjection => p !== null)
      : []
    return { featured, latest }
  }

  return { featured: [], latest: [] }
}

export async function getFiltersDropdownValues(
  lang: Locale
): Promise<FiltersDD> {
  if (client) {
    return await client.fetch(
      filtersDropdownQuery,
      { lang },
      getPolicyOptions('filters')
    )
  }

  return {
    priceRentDD: 0,
    priceSaleDD: 0,
    bedroomsDD: 0,
    bathroomsDD: 0,
    operacionDD: [],
    localizacionDD: [],
    tipoDD: [],
    total: 0,
  }
}

export async function getSearchProperties(
  searchParams: { [key: string]: string | string[] | undefined },
  lang: Locale
): Promise<PropertyListingProjection[]> {
  if (client) {
    const criteria = parseSearchParams(searchParams)
    const { query, params } = buildPropertySearchQuery(criteria)

    const raw = (await client.fetch(
      query,
      { ...params, lang },
      getSearchListingOptions(searchParams)
    )) as unknown
    if (!Array.isArray(raw)) return []
    return raw
      .map((r) =>
        toListingProjection(r as Parameters<typeof toListingProjection>[0])
      )
      .filter((p): p is PropertyListingProjection => p !== null)
  }

  return []
}

export async function getAllPropiedadesSlug(): Promise<PropertySlugProjection[]> {
  if (client) {
    const raw = (await client.fetch(
      propiedadSlugsQuery,
      {},
      getPolicyOptions('propiedades')
    )) as unknown
    if (!Array.isArray(raw)) return []
    return toSlugProjections(raw as Parameters<typeof toSlugProjections>[0])
  }
  return []
}

export async function getPropiedadBySlug(
  lang: Locale,
  slug: string
): Promise<PropertyDetailProjection> {
  if (client) {
    const raw = (await client.fetch(
      propiedadBySlugQuery,
      { slug, lang },
      getPropertyDetailOptions(slug)
    )) as Parameters<typeof toDetailProjection>[0]
    const projection = toDetailProjection(raw)
    if (projection) return projection
  }
  return {
    _id: '',
    title: '',
    slug,
    price: 0,
    operacion: { name: '', value: '' },
    tipo: '',
    localizacion: '',
  }
}

export async function getAllPagesSlug() {
  if (client) {
    const slugs: string[] = await client.fetch(
      pageSlugsQuery,
      {},
      getPolicyOptions('pages')
    )
    return slugs
  }
}

export async function getPageBySlug(slug: string, lang: Locale) {
  if (client) {
    return (
      (await client.fetch(
        pageBySlugQuery,
        { slug, lang },
        getPolicyOptions('pages')
      )) || ({} as any)
    )
  }

  return {} as any
}
