/**
 * Public Sanity data adapter.
 *
 * Production exports delegate to `createSanityDataAdapter` with the
 * default `next-sanity` client. Tests construct their own adapter
 * through the same factory with a fake fetch client.
 */

import { createClient } from 'next-sanity'

import type { Locale } from '@/i18n-config'
import type {
  FiltersDD,
  FrontPage,
} from './interfaces'
import {
  buildPropertySearchQuery,
  parseSearchParams,
} from './property-search'
import {
  toDetailProjection,
  toFeaturedProjections,
  toListingProjection,
  toSlugProjections,
} from './property-projection'
import type {
  PropertyDetailProjection,
  PropertyListingProjection,
  PropertySlugProjection,
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
import { apiVersion, dataset, projectId, useCdn } from './env'

/** Minimal fetch-client interface consumed by the adapter factory. */
export interface SanityFetchClient {
  fetch<T = unknown>(
    query: string,
    params?: Record<string, unknown>,
    options?: {
      cache?: 'force-cache' | 'no-store'
      next?: {
        revalidate?: number | false
        tags?: string[]
      }
    }
  ): Promise<T>
}

export type SanityPage = {
  slug?: string
  content: Array<{ _type: string; [key: string]: unknown }>
}

export type SanityDataAdapter = {
  getFrontPage(lang: Locale): Promise<FrontPage>
  getFiltersDropdownValues(lang: Locale): Promise<FiltersDD>
  getSearchProperties(
    searchParams: { [key: string]: string | string[] | undefined },
    lang: Locale
  ): Promise<PropertyListingProjection[]>
  getAllPropiedadesSlug(): Promise<PropertySlugProjection[]>
  getPropiedadBySlug(
    lang: Locale,
    slug: string
  ): Promise<PropertyDetailProjection | null>
  getAllPagesSlug(): Promise<string[] | undefined>
  getPageBySlug(slug: string, lang: Locale): Promise<SanityPage>
}

/**
 * Create the route-facing Sanity adapter backed by the given fetch client.
 */
export function createSanityDataAdapter(
  client: SanityFetchClient
): SanityDataAdapter {
  async function getFrontPage(lang: Locale): Promise<FrontPage> {
    const raw = (await client.fetch(
      frontPageQuery,
      { lang },
      getPolicyOptions('front-page')
    )) as { featured?: unknown; latest?: unknown[] } | null
    const featured = Array.isArray(raw?.featured)
      ? toFeaturedProjections(raw.featured)
      : []
    const latest = Array.isArray(raw?.latest)
      ? raw.latest
          .map((r) =>
            toListingProjection(
              r as Parameters<typeof toListingProjection>[0]
            )
          )
          .filter((p): p is PropertyListingProjection => p !== null)
      : []
    return { featured, latest }
  }

  async function getFiltersDropdownValues(lang: Locale): Promise<FiltersDD> {
    return await client.fetch(
      filtersDropdownQuery,
      { lang },
      getPolicyOptions('filters')
    )
  }

  async function getSearchProperties(
    searchParams: { [key: string]: string | string[] | undefined },
    lang: Locale
  ): Promise<PropertyListingProjection[]> {
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

  async function getAllPropiedadesSlug(): Promise<PropertySlugProjection[]> {
    const raw = (await client.fetch(
      propiedadSlugsQuery,
      {},
      getPolicyOptions('propiedades')
    )) as unknown
    if (!Array.isArray(raw)) return []
    return toSlugProjections(raw as Parameters<typeof toSlugProjections>[0])
  }

  async function getPropiedadBySlug(
    lang: Locale,
    slug: string
  ): Promise<PropertyDetailProjection | null> {
    const raw = (await client.fetch(
      propiedadBySlugQuery,
      { slug, lang },
      getPropertyDetailOptions(slug)
    )) as Parameters<typeof toDetailProjection>[0]
    return toDetailProjection(raw)
  }

  async function getAllPagesSlug(): Promise<string[] | undefined> {
    return (await client.fetch(
      pageSlugsQuery,
      {},
      getPolicyOptions('pages')
    )) as string[]
  }

  async function getPageBySlug(
    slug: string,
    lang: Locale
  ): Promise<SanityPage> {
    return (
      ((await client.fetch(
        pageBySlugQuery,
        { slug, lang },
        getPolicyOptions('pages')
      )) as SanityPage | null) || { content: [] }
    )
  }

  return {
    getFrontPage,
    getFiltersDropdownValues,
    getSearchProperties,
    getAllPropiedadesSlug,
    getPropiedadBySlug,
    getAllPagesSlug,
    getPageBySlug,
  }
}

export const client = createClient({ apiVersion, dataset, projectId, useCdn })

const sanityDataAdapter = createSanityDataAdapter(client)

export const getFrontPage = sanityDataAdapter.getFrontPage
export const getFiltersDropdownValues =
  sanityDataAdapter.getFiltersDropdownValues
export const getSearchProperties = sanityDataAdapter.getSearchProperties
export const getAllPropiedadesSlug = sanityDataAdapter.getAllPropiedadesSlug
export const getPropiedadBySlug = sanityDataAdapter.getPropiedadBySlug
export const getAllPagesSlug = sanityDataAdapter.getAllPagesSlug
export const getPageBySlug = sanityDataAdapter.getPageBySlug
