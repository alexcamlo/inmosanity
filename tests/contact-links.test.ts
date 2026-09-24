const assert = require('node:assert/strict')

const {
  buildWhatsAppPropertyUrl,
  WHATSAPP_PHONE_NUMBER,
} = require('../lib/contact-links')

const { getPropertyUrl } = require('../lib/site-routes')

function assertContactLink({
  locale,
  slug,
  title,
  prefix,
}: {
  locale: 'en' | 'es'
  slug: string
  title: string
  prefix: string
}) {
  const link = new URL(
    buildWhatsAppPropertyUrl({ locale, slug, title, messagePrefix: prefix })
  )
  const propertyUrl = getPropertyUrl(locale, { slug })

  assert.equal(link.protocol, 'https:')
  assert.equal(link.hostname, 'wa.me')
  assert.equal(link.pathname, `/${WHATSAPP_PHONE_NUMBER}`)
  assert.equal(
    link.searchParams.get('text'),
    `${prefix}: ${title}\n${propertyUrl}`
  )
  assert.equal(link.searchParams.size, 1)
  assert.equal(propertyUrl.includes('/en//'), false)
  assert.equal(propertyUrl.includes('/es//'), false)
}

assertContactLink({
  locale: 'en',
  slug: 'villa-green',
  title: 'Villa & Garden? #1',
  prefix: 'Hello, I am interested in this property',
})
console.log('English WhatsApp property link: OK')

assertContactLink({
  locale: 'es',
  slug: 'ático-bonalba',
  title: 'Ático con vistas & piscina? #2',
  prefix: 'Hola, me interesa esta propiedad',
})
console.log('Spanish WhatsApp property link with accents: OK')

console.log('\nAll contact-link tests passed.')
