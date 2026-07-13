import type { Locale } from '@/i18n-config'
import type { Metadata } from 'next'

import type { PropertyDetailProjection } from './property-projection'
import { getPropertyUrl, getStaticPageUrl } from './site-routes'

export const SITE_TITLE_DEFAULT = 'InmoGolf Bonalba'
export const SITE_TITLE_TEMPLATE = 'InmoGolf Bonalba | %s'

type RouteUrls = {
  canonical: string
  en: string
  es: string
}

function getAlternates(urls: RouteUrls): Metadata['alternates'] {
  return {
    canonical: urls.canonical,
    languages: {
      en: urls.en,
      es: urls.es,
    },
  }
}

function getStaticRouteUrls(locale: Locale, route: string): RouteUrls {
  return {
    canonical: getStaticPageUrl(locale, route),
    en: getStaticPageUrl('en', route),
    es: getStaticPageUrl('es', route),
  }
}

function getPropertyRouteUrls(
  locale: Locale,
  property: Pick<PropertyDetailProjection, 'slug'>
): RouteUrls {
  return {
    canonical: getPropertyUrl(locale, property),
    en: getPropertyUrl('en', property),
    es: getPropertyUrl('es', property),
  }
}

export function getHomeMetadata(locale: Locale): Metadata {
  const title =
    locale === 'en'
      ? 'InmoGolfBonalba | Your real estate agent in Bonalba Golf Club'
      : 'InmoGolfBonalba | Tu inmobiliaria en Club de Golf Bonalba'
  const description =
    locale === 'en'
      ? 'InmoGolf Bonalba, your real estate agent in Bonalba Golf Club'
      : 'Inmogolf Bonalba, tu Inmobiliaria en el campo de golf Bonalba'

  return {
    title: { absolute: title },
    description,
    alternates: getAlternates(getStaticRouteUrls(locale, '')),
  }
}

export function getPropertyListingMetadata(locale: Locale): Metadata {
  return {
    title: locale === 'en' ? 'Properties' : 'Propiedades',
    description:
      locale === 'en'
        ? 'Properties available in Bonalba Golf Club.'
        : 'Propiedades disponibles en el Club de Golf Bonalba.',
    alternates: getAlternates(getStaticRouteUrls(locale, 'propiedades')),
  }
}

export function getLegalNoticeMetadata(locale: Locale): Metadata {
  return {
    title: locale === 'en' ? 'Legal notice' : 'Aviso legal',
    description:
      locale === 'en'
        ? 'Legal information for InmoGolf Bonalba.'
        : 'Información legal de InmoGolf Bonalba.',
    alternates: getAlternates(getStaticRouteUrls(locale, 'aviso-legal')),
  }
}

export function getPropertyMetadata(
  locale: Locale,
  property: PropertyDetailProjection
): Metadata {
  const details = [property.tipo, property.localizacion].filter(Boolean)
  const description =
    details.length > 0
      ? `${property.title} — ${details.join(', ')}`
      : property.title

  return {
    title: property.title,
    description,
    alternates: getAlternates(getPropertyRouteUrls(locale, property)),
  }
}

export function getMissingPropertyMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: false,
    },
  }
}
