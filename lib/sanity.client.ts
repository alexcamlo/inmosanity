import { Locale } from '@/i18n-config'
import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId, useCdn } from './env'
import { FiltersDD, FrontPage, Propiedad } from './interfaces'
import {
  PROPIEDAD_FIELDS,
  filtersDropdownQuery,
  frontPageQuery,
  pageBySlugQuery,
  pageSlugsQuery,
  propiedadBySlugQuery,
  propiedadSlugsQuery,
} from './sanity.queries'
import {
  getPolicyOptions,
  getPropertyDetailOptions,
  getSearchListingOptions,
} from './sanity.cache'

export const client = createClient({ apiVersion, dataset, projectId, useCdn })

export async function getFrontPage(lang: Locale): Promise<FrontPage> {
  if (client) {
    const { featured, latest } = await client.fetch(
      frontPageQuery,
      { lang },
      getPolicyOptions('front-page')
    )
    return {
      featured,
      latest,
    }
  }

  return {} as any
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

  return {} as any
}

export async function getSearchProperties(
  searchParams: { [key: string]: string | string[] | undefined },
  lang: Locale
): Promise<Propiedad[]> {
  if (client) {
    let query = `*[_type == 'propiedad'`
    const queryMap: Record<string, (value: string) => string> = {
      precioMin: (value: string) => `price >= ${Number(value)}`,
      precioMax: (value: string) => `price <= ${Number(value)}`,
      banos: (value: string) => `bathrooms == ${value}`,
      habitaciones: (value: string) => `bedrooms == ${value}`,
      localizacion: (value: string) => {
        if (value == 'localizacion-todas') {
          return `(localizacion._ref != '${value}' || localizacion->parent._ref != '${value}')`
        }
        return `(localizacion._ref == '${value}' || localizacion->parent._ref == '${value}')`
      },
      tipo: (value: string) => {
        if (value == 'tipo-todos') {
          return `tipo._ref != '${value}'`
        }
        return `tipo._ref == '${value}'`
      },
    }

    for (const [key, value] of Object.entries(searchParams)) {
      const strValue = typeof value === 'string' ? value : undefined
      if (!strValue) continue
      const queryFn = queryMap[key]
      if (queryFn) {
        query += ` && ${queryFn(strValue)} `
      } else {
        query += ` && ${key}._ref == '${strValue}' `
      }
    }
    query += `]{
        ${PROPIEDAD_FIELDS}
        "coverImage": images[0],
        _createdAt,
    } | order(_createdAt desc)[0...50]`

    return await client.fetch(
      query,
      { lang },
      getSearchListingOptions(searchParams)
    )
  }

  return {} as any
}

export async function getAllPropiedadesSlug(): Promise<
  Pick<Propiedad, 'slug'>[]
> {
  if (client) {
    const slugs: string[] = await client.fetch(
      propiedadSlugsQuery,
      {},
      getPolicyOptions('propiedades')
    )
    return slugs.map((slug) => ({ slug }))
  }
  return []
}

export async function getPropiedadBySlug(
  lang: Locale,
  slug: string
): Promise<Propiedad> {
  if (client) {
    return (
      (await client.fetch(
        propiedadBySlugQuery,
        { slug, lang },
        getPropertyDetailOptions(slug)
      )) || ({} as any)
    )
  }

  return {} as any
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
