/**
 * Propiedad search module.
 *
 * Owns the normalized search criteria for listing pages, the URL
 * serialization for them, and the GROQ fragment that turns criteria
 * into a listing query. UI modules, the listing route, and the
 * Sanity data adapter all consume this module instead of repeating
 * the search vocabulary.
 *
 * No Sanity / Next dependencies — testable without mocks.
 */

import { groq } from 'next-sanity'

import { PROPIEDAD_FIELDS } from './sanity.queries'

/** Sentinel value for "all locations" in URL state. */
export const LOCATION_ALL = 'localizacion-todas'
/** Sentinel value for "all types" in URL state. */
export const TIPO_ALL = 'tipo-todos'
/** Default operacion (sale). */
export const OPERACION_VENTA = 'operacion-en-venta'
/** Operacion value for rentals. */
export const OPERACION_ALQUILER = 'operacion-en-alquiler'

/** Raw search params as accepted by App Router routes. */
export type RawSearchParams = Record<string, string | string[] | undefined>

/** Normalized search criteria shared by the search UI and the data adapter. */
export type PropertySearchCriteria = {
  operacion?: string
  tipo?: string
  localizacion?: string
  precioMin?: number
  precioMax?: number
  banos?: number
  habitaciones?: number
}

export type PropertySearchQueryResult = {
  /** GROQ query string with named parameters for user-controlled values. */
  query: string
  /** Parameters that must be passed alongside the query. */
  params: Record<string, unknown>
}

const KNOWN_KEYS = new Set([
  'operacion',
  'tipo',
  'localizacion',
  'precioMin',
  'precioMax',
  'banos',
  'habitaciones',
])

/** "All" values that mean "don't filter on this field". */
const ALL_VALUES = new Set([LOCATION_ALL, TIPO_ALL])

/** Parse a single raw value into a string, dropping arrays and empty entries. */
function readString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (
    Array.isArray(value) &&
    typeof value[0] === 'string' &&
    value[0].length > 0
  ) {
    return value[0]
  }
  return undefined
}

function readNumber(value: string | string[] | undefined): number | undefined {
  const raw = readString(value)
  if (raw === undefined) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

/** True if the raw params represent a listing filter beyond the default sale view. */
export function hasActiveFilters(
  params: RawSearchParams | undefined | null
): boolean {
  if (!params) return false

  for (const [key, value] of Object.entries(params)) {
    if (!KNOWN_KEYS.has(key)) continue
    const raw = readString(value)
    if (raw === undefined) continue

    if (key === 'operacion') {
      if (raw !== OPERACION_VENTA) return true
      continue
    }
    if ((key === 'tipo' || key === 'localizacion') && ALL_VALUES.has(raw)) {
      continue
    }
    if (
      (key === 'precioMin' || key === 'precioMax') &&
      readNumber(value) === undefined
    ) {
      continue
    }
    return true
  }

  return false
}

/** Convert raw URL/search params into normalized search criteria. */
export function parseSearchParams(
  params: RawSearchParams | undefined | null
): PropertySearchCriteria {
  if (!params) return {}

  const operacion = readString(params.operacion)
  const tipo = readString(params.tipo)
  const localizacion = readString(params.localizacion)
  const precioMin = readNumber(params.precioMin)
  const precioMax = readNumber(params.precioMax)
  const banos = readNumber(params.banos)
  const habitaciones = readNumber(params.habitaciones)

  return {
    ...(operacion ? { operacion } : {}),
    ...(tipo ? { tipo } : {}),
    ...(localizacion ? { localizacion } : {}),
    ...(precioMin !== undefined ? { precioMin } : {}),
    ...(precioMax !== undefined ? { precioMax } : {}),
    ...(banos !== undefined ? { banos } : {}),
    ...(habitaciones !== undefined ? { habitaciones } : {}),
  }
}

/** Convert normalized search criteria back into a URL search-param string. */
export function serializeSearchCriteria(
  criteria: PropertySearchCriteria
): string {
  const out = new URLSearchParams()
  if (criteria.operacion) out.set('operacion', criteria.operacion)
  if (criteria.tipo) out.set('tipo', criteria.tipo)
  if (criteria.localizacion) out.set('localizacion', criteria.localizacion)
  if (criteria.precioMin !== undefined) {
    out.set('precioMin', String(criteria.precioMin))
  }
  if (criteria.precioMax !== undefined) {
    out.set('precioMax', String(criteria.precioMax))
  }
  if (criteria.banos !== undefined) out.set('banos', String(criteria.banos))
  if (criteria.habitaciones !== undefined) {
    out.set('habitaciones', String(criteria.habitaciones))
  }
  return out.toString()
}

function isAllValue(value: string | undefined): boolean {
  return value !== undefined && ALL_VALUES.has(value)
}

/**
 * Build the GROQ fragment that turns normalized criteria into a listing query.
 * User-controlled values are passed as GROQ params, not interpolated.
 */
export function buildPropertySearchGroq(
  criteria: PropertySearchCriteria
): string {
  const filters: string[] = ["_type == 'propiedad'"]

  if (criteria.operacion) {
    filters.push('operacion._ref == $operacion')
  }
  if (criteria.tipo && !isAllValue(criteria.tipo)) {
    filters.push('tipo._ref == $tipo')
  } else if (isAllValue(criteria.tipo)) {
    filters.push(`tipo._ref != '${TIPO_ALL}'`)
  }

  if (criteria.localizacion && !isAllValue(criteria.localizacion)) {
    filters.push(
      '(localizacion._ref == $localizacion || localizacion->parent._ref == $localizacion)'
    )
  } else if (isAllValue(criteria.localizacion)) {
    filters.push(
      `(localizacion._ref != '${LOCATION_ALL}' || localizacion->parent._ref != '${LOCATION_ALL}')`
    )
  }

  if (criteria.precioMin !== undefined) filters.push('price >= $precioMin')
  if (criteria.precioMax !== undefined) filters.push('price <= $precioMax')
  if (criteria.banos !== undefined) filters.push('bathrooms == $banos')
  if (criteria.habitaciones !== undefined) {
    filters.push('bedrooms == $habitaciones')
  }

  return groq`*[${filters.join(' && ')}]{
    ${PROPIEDAD_FIELDS}
    "coverImage": images[0],
    _createdAt,
  } | order(_createdAt desc)[0...50]`
}

/**
 * Produce a complete query result for the listing route. The caller passes
 * the query string and params to the Sanity client; language params are
 * added by the data adapter at call time.
 */
export function buildPropertySearchQuery(
  criteria: PropertySearchCriteria
): PropertySearchQueryResult {
  const params: Record<string, unknown> = {}
  if (criteria.operacion) params.operacion = criteria.operacion
  if (criteria.tipo && !isAllValue(criteria.tipo)) params.tipo = criteria.tipo
  if (criteria.localizacion && !isAllValue(criteria.localizacion)) {
    params.localizacion = criteria.localizacion
  }
  if (criteria.precioMin !== undefined) params.precioMin = criteria.precioMin
  if (criteria.precioMax !== undefined) params.precioMax = criteria.precioMax
  if (criteria.banos !== undefined) params.banos = criteria.banos
  if (criteria.habitaciones !== undefined) {
    params.habitaciones = criteria.habitaciones
  }

  return {
    query: buildPropertySearchGroq(criteria),
    params,
  }
}

/** A criteria object equivalent to "no filters applied". */
export const EMPTY_SEARCH_CRITERIA: PropertySearchCriteria = {}
