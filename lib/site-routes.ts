import type { PropertySlugProjection } from './property-projection'

export const SITE_URL = 'https://inmogolfbonalba.com'

export function getPropertyUrl(
  locale: string,
  propiedad: PropertySlugProjection
): string {
  return `${SITE_URL}/${locale}/propiedad/${propiedad.slug}`
}

export function getStaticPageUrl(locale: string, route: string): string {
  return `${SITE_URL}/${locale}/${route}`
}
