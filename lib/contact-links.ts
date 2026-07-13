import type { Locale } from '@/i18n-config'

import { getPropertyUrl } from './site-routes'

export const WHATSAPP_PHONE_NUMBER = '34655849409'

interface WhatsAppPropertyLinkInput {
  locale: Locale
  slug: string
  title: string
  messagePrefix: string
}

export function buildWhatsAppPropertyUrl({
  locale,
  slug,
  title,
  messagePrefix,
}: WhatsAppPropertyLinkInput): string {
  const propertyUrl = getPropertyUrl(locale, { slug })
  const message = `${messagePrefix}: ${title}\n${propertyUrl}`
  const url = new URL(`https://wa.me/${WHATSAPP_PHONE_NUMBER}`)
  url.searchParams.set('text', message)
  return url.toString()
}
