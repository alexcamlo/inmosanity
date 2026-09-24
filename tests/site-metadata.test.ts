const assert = require('node:assert/strict')

const {
  getHomeMetadata,
  getLegalNoticeMetadata,
  getMissingPropertyMetadata,
  getPropertyListingMetadata,
  getPropertyMetadata,
  SITE_TITLE_DEFAULT,
  SITE_TITLE_TEMPLATE,
} = require('../lib/site-metadata')

const SITE_ROOT = 'https://inmogolfbonalba.com'

assert.equal(SITE_TITLE_DEFAULT, 'InmoGolf Bonalba')
assert.equal(SITE_TITLE_TEMPLATE, 'InmoGolf Bonalba | %s')
assert.deepEqual(getMissingPropertyMetadata(), {
  robots: { index: false, follow: false },
})

function assertAlternates(metadata, canonical, en, es) {
  assert.equal(metadata.alternates?.canonical, canonical)
  assert.deepEqual(metadata.alternates?.languages, { en, es })
  assert.notEqual(metadata.alternates?.canonical, SITE_ROOT)
  assert.notEqual(metadata.alternates?.canonical, `${SITE_ROOT}/`)
}

for (const locale of ['en', 'es']) {
  {
    const metadata = getHomeMetadata(locale)
    assert.deepEqual(metadata.title, {
      absolute:
        locale === 'en'
          ? 'InmoGolfBonalba | Your real estate agent in Bonalba Golf Club'
          : 'InmoGolfBonalba | Tu inmobiliaria en Club de Golf Bonalba',
    })
    assertAlternates(
      metadata,
      `${SITE_ROOT}/${locale}`,
      `${SITE_ROOT}/en`,
      `${SITE_ROOT}/es`
    )
  }

  {
    const metadata = getPropertyListingMetadata(locale)
    assert.equal(metadata.title, locale === 'en' ? 'Properties' : 'Propiedades')
    assertAlternates(
      metadata,
      `${SITE_ROOT}/${locale}/propiedades`,
      `${SITE_ROOT}/en/propiedades`,
      `${SITE_ROOT}/es/propiedades`
    )
  }

  {
    const metadata = getLegalNoticeMetadata(locale)
    assert.equal(metadata.title, locale === 'en' ? 'Legal notice' : 'Aviso legal')
    assertAlternates(
      metadata,
      `${SITE_ROOT}/${locale}/aviso-legal`,
      `${SITE_ROOT}/en/aviso-legal`,
      `${SITE_ROOT}/es/aviso-legal`
    )
  }

  {
    const property = {
      _id: 'property-1',
      title: 'Villa Sol',
      slug: 'villa-sol',
      price: 250000,
      operacion: { name: 'Sale', value: 'operacion-en-venta' },
      tipo: 'Villa',
      localizacion: 'Bonalba',
    }
    const metadata = getPropertyMetadata(locale, property)
    assert.equal(metadata.title, property.title)
    assert.equal(String(metadata.title).includes('InmoGolf Bonalba'), false)
    assert.match(metadata.description, /Villa Sol/)
    assert.match(metadata.description, /Villa/)
    assert.match(metadata.description, /Bonalba/)
    assertAlternates(
      metadata,
      `${SITE_ROOT}/${locale}/propiedad/villa-sol`,
      `${SITE_ROOT}/en/propiedad/villa-sol`,
      `${SITE_ROOT}/es/propiedad/villa-sol`
    )
  }

}

console.log('All site-metadata tests passed.')
