/**
 * Propiedad projection module.
 *
 * Owns the typed shapes consumed by the UI (listing, detail) and the
 * sitemap/static-route generator (slug). The data adapter and queries
 * return raw GROQ records; this module normalizes them into the
 * projection shapes so UI code does not have to know GROQ paths,
 * localized-field fallbacks, or slug mapping.
 *
 * UI code should consume only:
 *   - `PropertyListingProjection` (cards, latest list, search results)
 *   - `PropertyDetailProjection`  (detail page)
 *   - `PropertySlugProjection`    (sitemap, generateStaticParams)
 *
 * No Sanity / Next dependencies — testable without mocks.
 */

import type { Image } from 'sanity'

/** Operacion reference expanded to the view's name + ref. */
export type PropertyOperacionView = {
  name: string
  value: string
}

/** Localizacion parent label, when present. */
export type PropertyLocalizacionPadre = {
  parent?: {
    title?: string
  }
}

/** Localized image used as cover or gallery. */
export type PropertyImage = Image

/**
 * Listing projection: minimum shape consumed by the Propiedad card,
 * the front-page "latest" grid, and the search-results grid.
 */
export type PropertyListingProjection = {
  _id: string
  title: string
  slug: string
  price: number
  operacion: PropertyOperacionView
  tipo: string
  localizacion: string
  localizacionPadre?: PropertyLocalizacionPadre
  coverImage?: PropertyImage
  bedrooms?: number
  bathrooms?: number
  size?: number
  year?: number
}

/** Caracteristica feature rendered on the detail page. */
export type PropertyCaracteristica = {
  title: string
}

/**
 * Detail projection: full shape consumed by the detail page. Includes
 * everything in the listing projection plus gallery, description, and
 * feature list.
 */
export type PropertyDetailProjection = PropertyListingProjection & {
  images?: PropertyImage[]
  caracteristicas?: PropertyCaracteristica[]
  description?: string
}

/** Slug projection consumed by sitemap / static-route generation. */
export type PropertySlugProjection = {
  slug: string
}

/** Raw record shape coming back from the listing GROQ query. */
type RawOperacion = {
  name?: string
  value?: string
}

type RawLocalizacionPadre = {
  parent?: { title?: string }
}

type RawListingRecord = {
  _id?: string
  title?: string
  slug?: string | null
  price?: number | null
  operacion?: RawOperacion | null
  tipo?: string | null
  localizacion?: string | null
  localizacionPadre?: RawLocalizacionPadre | null
  coverImage?: Image | null
  bedrooms?: number | null
  bathrooms?: number | null
  size?: number | null
  year?: number | null
}

/** Raw record shape coming back from the detail GROQ query. */
type RawDetailRecord = RawListingRecord & {
  images?: Image[] | null
  caracteristicas?: { title?: string | null }[] | null
  description?: string | null
}

/** Raw record shape coming back from the slug GROQ query. */
type RawSlugRecord = string | { current?: string | null } | null | undefined

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function toOperacionView(
  raw: RawOperacion | null | undefined
): PropertyOperacionView {
  return {
    name: nonEmptyString(raw?.name) ?? '',
    value: nonEmptyString(raw?.value) ?? '',
  }
}

function toLocalizacionPadre(
  raw: RawLocalizacionPadre | null | undefined
): PropertyLocalizacionPadre | undefined {
  if (!raw) return undefined
  const title = nonEmptyString(raw.parent?.title)
  if (!title) {
    return raw.parent ? { parent: {} } : undefined
  }
  return { parent: { title } }
}

/**
 * Normalize a raw listing record into the listing projection.
 *
 * Missing fields are preserved as `undefined` (or empty strings where
 * the UI renders them) so callers do not need `as any` casts.
 */
export function toListingProjection(
  raw: RawListingRecord | null | undefined
): PropertyListingProjection | null {
  if (!raw) return null
  const _id = nonEmptyString(raw._id)
  const title = nonEmptyString(raw.title)
  const slug = nonEmptyString(raw.slug)
  if (!_id || !title || !slug) return null

  const projection: PropertyListingProjection = {
    _id,
    title,
    slug,
    price: typeof raw.price === 'number' ? raw.price : 0,
    operacion: toOperacionView(raw.operacion),
    tipo: nonEmptyString(raw.tipo) ?? '',
    localizacion: nonEmptyString(raw.localizacion) ?? '',
  }

  const padre = toLocalizacionPadre(raw.localizacionPadre)
  if (padre) projection.localizacionPadre = padre

  if (raw.coverImage) projection.coverImage = raw.coverImage
  if (typeof raw.bedrooms === 'number') projection.bedrooms = raw.bedrooms
  if (typeof raw.bathrooms === 'number') projection.bathrooms = raw.bathrooms
  if (typeof raw.size === 'number') projection.size = raw.size
  if (typeof raw.year === 'number') projection.year = raw.year

  return projection
}

/**
 * Normalize a raw detail record into the detail projection. Returns
 * `null` if the record is missing the minimum identity fields.
 */
export function toDetailProjection(
  raw: RawDetailRecord | null | undefined
): PropertyDetailProjection | null {
  const base = toListingProjection(raw)
  if (!base) return null

  const detail: PropertyDetailProjection = { ...base }

  if (raw?.images) {
    detail.images = raw.images
  }
  if (raw?.caracteristicas) {
    const features: PropertyCaracteristica[] = []
    for (const c of raw.caracteristicas) {
      const t = nonEmptyString(c.title)
      if (t) features.push({ title: t })
    }
    if (features.length > 0) detail.caracteristicas = features
  }
  const description = nonEmptyString(raw?.description)
  if (description) detail.description = description

  return detail
}

/** Normalize a raw slug record into the slug projection. */
export function toSlugProjection(
  raw: RawSlugRecord
): PropertySlugProjection | null {
  if (typeof raw === 'string') {
    return raw.length > 0 ? { slug: raw } : null
  }
  if (raw && typeof raw === 'object') {
    const slug = nonEmptyString(raw.current)
    return slug ? { slug } : null
  }
  return null
}

/**
 * Map an array of raw slug records into slug projections, dropping
 * records that cannot be normalized.
 */
export function toSlugProjections(
  raws: readonly RawSlugRecord[] | null | undefined
): PropertySlugProjection[] {
  if (!raws) return []
  const out: PropertySlugProjection[] = []
  for (const raw of raws) {
    const slug = toSlugProjection(raw)
    if (slug) out.push(slug)
  }
  return out
}

/** Fields the listing projection must always carry. */
export const LISTING_PROJECTION_KEYS = [
  '_id',
  'title',
  'slug',
  'price',
  'operacion',
  'tipo',
  'localizacion',
] as const

/** Extra fields the detail projection carries beyond listing. */
export const DETAIL_PROJECTION_KEYS = [
  'images',
  'caracteristicas',
  'description',
] as const

/** Slug projection key. */
export const SLUG_PROJECTION_KEYS = ['slug'] as const
