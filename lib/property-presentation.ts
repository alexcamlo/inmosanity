/**
 * Propiedad presentation module.
 *
 * Owns the shared display rules for Propiedad views (card and detail).
 * Card and detail adapters consume the same primitive decisions so the
 * rendered UI stays consistent:
 *   - price formatting (always locale-formatted EUR)
 *   - rent suffix decision (only rentals show a suffix; the suffix
 *     text differs by scope — `/{alquiler_tag}` on the card,
 *     `/mes` on the detail page)
 *   - location fallback (parent label is prefixed only when present)
 *   - fact visibility (which of bedrooms / bathrooms / size / year
 *     are shown; the detail page also shows 0 bedrooms)
 *
 * No Sanity / Next / React dependencies — testable without mocks.
 */

import { formatEUR } from './utils'
import type { PropertyDetailProjection, PropertyListingProjection } from './property-projection'

/** Operacion value for rentals. */
export const RENT_OPERACION_VALUE = 'operacion-en-alquiler'

/** Where a presentation rule is consumed. */
export type PropertyScope = 'card' | 'detail'

/** Input the presentation rules accept. */
export type PresentationPropiedad = Pick<
  PropertyListingProjection,
  'price' | 'operacion' | 'localizacion' | 'localizacionPadre'
> & {
  bedrooms?: number | null
  bathrooms?: number | null
  size?: number | null
  year?: number | null
}

/** Minimal dictionary shape needed by the presentation rules. */
export type PresentationDict = {
  alquiler_tag: string
}

/** Fact key catalog — used as a regression fence. */
export const PROPERTY_FACT_KEYS = [
  'bedrooms',
  'bathrooms',
  'size',
  'year',
] as const

export type PropertyFactKey = (typeof PROPERTY_FACT_KEYS)[number]

/** A visible fact ready to render. */
export type PropertyFact = {
  key: PropertyFactKey
  value: number
  /** Optional unit suffix (e.g. "m²"). */
  unit?: string
}

/** Formatted price (and an optional rent suffix) for a single render site. */
export type PropertyPriceDisplay = {
  price: string
  rentSuffix: string | null
}

/** Location label parts for a single render site. */
export type PropertyLocationDisplay = {
  parent: string | null
  child: string
}

/** True if the property is a rental. */
export function isRent(propiedad: PresentationPropiedad): boolean {
  return propiedad.operacion.value === RENT_OPERACION_VALUE
}

/**
 * Format the property price as locale-formatted EUR.
 *
 * Card and detail both use the same formatter, so the price never
 * drifts between views.
 */
export function formatPropertyPrice(price: number): string {
  return formatEUR(Number(price))
}

/**
 * The rent suffix text for a given scope, or `null` when no suffix
 * should be rendered.
 *
 * The card uses the dictionary's `alquiler_tag` so the user-facing
 * copy is translatable; the detail page keeps `/mes` to match the
 * existing rendered output.
 */
export function getRentSuffix(
  propiedad: PresentationPropiedad,
  scope: PropertyScope,
  dict: PresentationDict
): string | null {
  if (!isRent(propiedad)) return null
  if (scope === 'card') {
    return `/${dict.alquiler_tag}`
  }
  return '/mes'
}

/** Formatted price + (optional) rent suffix for a single render site. */
export function getPropertyPriceDisplay(
  propiedad: PresentationPropiedad,
  scope: PropertyScope,
  dict: PresentationDict
): PropertyPriceDisplay {
  return {
    price: formatPropertyPrice(propiedad.price),
    rentSuffix: getRentSuffix(propiedad, scope, dict),
  }
}

/**
 * Split a property's location into the parent label (when present) and
 * the child label. Card and detail share the same fallback rule: the
 * parent is shown as `<parent> - ` only when its title is non-empty.
 */
export function getPropertyLocationDisplay(
  propiedad: PresentationPropiedad
): PropertyLocationDisplay {
  const parentTitle = propiedad.localizacionPadre?.parent?.title?.trim()
  return {
    parent: parentTitle && parentTitle.length > 0 ? parentTitle : null,
    child: propiedad.localizacion,
  }
}

/**
 * Decide which facts are visible for a given scope.
 *
 * The card does not show a `0` bedrooms value (matching the prior
 * `!!propiedad.bedrooms` gate). The detail page does show `0`
 * bedrooms, matching the prior `propiedad.bedrooms ||
 * propiedad.bedrooms === 0` gate. Bathrooms are shown in both views
 * even when `0` (the prior `(b || b === 0)` gate). `size` and `year`
 * are shown in both views whenever they are a positive number.
 */
export function getPropertyFacts(
  propiedad: PresentationPropiedad,
  scope: PropertyScope
): PropertyFact[] {
  const facts: PropertyFact[] = []

  if (typeof propiedad.bedrooms === 'number') {
    if (scope === 'detail' || propiedad.bedrooms !== 0) {
      facts.push({ key: 'bedrooms', value: propiedad.bedrooms })
    }
  }

  if (typeof propiedad.bathrooms === 'number') {
    facts.push({ key: 'bathrooms', value: propiedad.bathrooms })
  }

  if (typeof propiedad.size === 'number' && propiedad.size > 0) {
    facts.push({ key: 'size', value: propiedad.size, unit: 'm²' })
  }

  if (typeof propiedad.year === 'number' && propiedad.year > 0) {
    facts.push({ key: 'year', value: propiedad.year })
  }

  return facts
}

/** Convenience for detail consumers: full presentation bundle. */
export function describeProperty(
  propiedad: PropertyDetailProjection | PropertyListingProjection,
  scope: PropertyScope,
  dict: PresentationDict
): {
  price: PropertyPriceDisplay
  location: PropertyLocationDisplay
  facts: PropertyFact[]
} {
  return {
    price: getPropertyPriceDisplay(propiedad, scope, dict),
    location: getPropertyLocationDisplay(propiedad),
    facts: getPropertyFacts(propiedad, scope),
  }
}
