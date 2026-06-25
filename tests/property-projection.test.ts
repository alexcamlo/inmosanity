const assert = require('node:assert/strict')

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'test-project'
process.env.NEXT_PUBLIC_SANITY_DATASET = 'test-dataset'

const {
  LISTING_PROJECTION_KEYS,
  DETAIL_PROJECTION_KEYS,
  SLUG_PROJECTION_KEYS,
  toListingProjection,
  toDetailProjection,
  toSlugProjection,
  toSlugProjections,
} = require('../lib/property-projection')

// ── Helpers ──────────────────────────────────────────────────────────

const mockImage = {
  _type: 'image',
  asset: {
    _ref: 'image-abc123-2000x3000-jpg',
    _type: 'reference',
  },
}

const fullListingRaw = {
  _id: 'prop-1',
  title: 'Casa en la playa',
  slug: 'casa-en-la-playa',
  price: 250000,
  operacion: { name: 'Venta', value: 'operacion-en-venta' },
  tipo: 'Casa',
  localizacion: 'Altea',
  localizacionPadre: { parent: { title: 'Alicante' } },
  coverImage: mockImage,
  bedrooms: 3,
  bathrooms: 2,
  size: 120,
  year: 2010,
}

// ── Projection key catalog (regression fence) ────────────────────────

{
  // If a projection key is renamed/removed accidentally, this test
  // forces an explicit decision. Update the catalog only when the
  // projection shape actually changes.
  assert.deepEqual(
    [...LISTING_PROJECTION_KEYS],
    ['_id', 'title', 'slug', 'price', 'operacion', 'tipo', 'localizacion']
  )
  assert.deepEqual(
    [...DETAIL_PROJECTION_KEYS],
    ['images', 'caracteristicas', 'description']
  )
  assert.deepEqual([...SLUG_PROJECTION_KEYS], ['slug'])
}
console.log('Projection key catalog: OK')

// ── toListingProjection: full record ─────────────────────────────────

{
  const p = toListingProjection(fullListingRaw)
  assert.ok(p, 'projection should be returned for a full record')
  assert.equal(p._id, 'prop-1')
  assert.equal(p.title, 'Casa en la playa')
  assert.equal(p.slug, 'casa-en-la-playa')
  assert.equal(p.price, 250000)
  assert.deepEqual(p.operacion, {
    name: 'Venta',
    value: 'operacion-en-venta',
  })
  assert.equal(p.tipo, 'Casa')
  assert.equal(p.localizacion, 'Altea')
  assert.deepEqual(p.localizacionPadre, { parent: { title: 'Alicante' } })
  assert.equal(p.coverImage, mockImage)
  assert.equal(p.bedrooms, 3)
  assert.equal(p.bathrooms, 2)
  assert.equal(p.size, 120)
  assert.equal(p.year, 2010)
}
console.log('toListingProjection full record: OK')

// ── toListingProjection: required fields missing → null ──────────────

{
  assert.equal(toListingProjection(null), null)
  assert.equal(toListingProjection(undefined), null)
  assert.equal(toListingProjection({}), null)
  assert.equal(toListingProjection({ _id: 'x' }), null)
  assert.equal(
    toListingProjection({ _id: 'x', title: 'T', slug: '' }),
    null,
    'empty slug should drop the record'
  )
}
console.log('toListingProjection identity gate: OK')

// ── toListingProjection: optional fields absent ─────────────────────

{
  const p = toListingProjection({
    _id: 'prop-2',
    title: 'A',
    slug: 'a',
    price: 0,
    operacion: {},
    tipo: '',
    localizacion: '',
  })
  assert.ok(p)
  assert.equal(p.price, 0)
  assert.deepEqual(p.operacion, { name: '', value: '' })
  assert.equal(p.tipo, '')
  assert.equal(p.localizacion, '')
  assert.equal(p.localizacionPadre, undefined)
  assert.equal(p.coverImage, undefined)
  assert.equal(p.bedrooms, undefined)
}
console.log('toListingProjection minimal record: OK')

// ── toListingProjection: localizacionPadre without title is empty obj ─

{
  const p = toListingProjection({
    ...fullListingRaw,
    localizacionPadre: { parent: {} },
  })
  assert.ok(p)
  assert.deepEqual(p.localizacionPadre, { parent: {} })
}

{
  // The parent wrapper itself is absent → no localizacionPadre emitted
  const p = toListingProjection({
    ...fullListingRaw,
    localizacionPadre: {},
  })
  assert.ok(p)
  assert.equal(p.localizacionPadre, undefined)
}
console.log('toListingProjection localizacionPadre fallback: OK')

// ── toListingProjection: nulls and wrong types in number fields ──────

{
  const p = toListingProjection({
    ...fullListingRaw,
    price: null,
    bedrooms: null,
    bathrooms: undefined,
    size: '120',
    year: null,
  })
  assert.ok(p)
  assert.equal(p.price, 0, 'null price defaults to 0 to satisfy display')
  assert.equal(p.bedrooms, undefined)
  assert.equal(p.bathrooms, undefined)
  assert.equal(p.size, undefined, 'non-number size is dropped')
  assert.equal(p.year, undefined)
}
console.log('toListingProjection number coercion: OK')

// ── toDetailProjection: extends listing ──────────────────────────────

{
  const d = toDetailProjection({
    ...fullListingRaw,
    images: [mockImage, mockImage],
    caracteristicas: [{ title: 'Piscina' }, { title: '' }, { title: 'Jardín' }],
    description: 'Una casa bonita',
  })
  assert.ok(d)
  // Listing identity preserved
  assert.equal(d.slug, 'casa-en-la-playa')
  // Detail additions
  assert.equal(d.images?.length, 2)
  assert.deepEqual(d.caracteristicas, [
    { title: 'Piscina' },
    { title: 'Jardín' },
  ])
  assert.equal(d.description, 'Una casa bonita')
}
console.log('toDetailProjection shape: OK')

{
  // No detail-only fields → detail projection still works
  const d = toDetailProjection(fullListingRaw)
  assert.ok(d)
  assert.equal(d.images, undefined)
  assert.equal(d.caracteristicas, undefined)
  assert.equal(d.description, undefined)
}
console.log('toDetailProjection listing-only fallback: OK')

{
  // Empty image arrays are preserved because the detail page uses
  // them to apply no-image layout padding. Empty feature arrays are dropped.
  const d = toDetailProjection({
    ...fullListingRaw,
    images: [],
    caracteristicas: [],
  })
  assert.ok(d)
  assert.deepEqual(d.images, [])
  assert.equal(d.caracteristicas, undefined)
}
console.log('toDetailProjection empty arrays: OK')

{
  // Null detail record → null
  assert.equal(toDetailProjection(null), null)
  assert.equal(toDetailProjection(undefined), null)
}
console.log('toDetailProjection null guard: OK')

// ── toSlugProjection: string and object forms ────────────────────────

{
  assert.deepEqual(toSlugProjection('casa-a'), { slug: 'casa-a' })
  assert.deepEqual(toSlugProjection({ current: 'casa-b' }), { slug: 'casa-b' })
  assert.equal(toSlugProjection(''), null)
  assert.equal(toSlugProjection({}), null)
  assert.equal(toSlugProjection({ current: '' }), null)
  assert.equal(toSlugProjection(null), null)
  assert.equal(toSlugProjection(undefined), null)
}
console.log('toSlugProjection shapes: OK')

// ── toSlugProjections: bulk + filter ─────────────────────────────────

{
  const result = toSlugProjections([
    'casa-a',
    { current: 'casa-b' },
    '',
    null,
    undefined,
    { current: 'casa-c' },
  ])
  assert.deepEqual(result, [
    { slug: 'casa-a' },
    { slug: 'casa-b' },
    { slug: 'casa-c' },
  ])
}

{
  assert.deepEqual(toSlugProjections(null), [])
  assert.deepEqual(toSlugProjections(undefined), [])
  assert.deepEqual(toSlugProjections([]), [])
}
console.log('toSlugProjections: OK')

console.log('\nAll property-projection tests passed.')
