const assert = require('node:assert/strict')

// No Sanity env vars needed — this module is pure logic.

const { getRevalidationTags } = require('../lib/sanity.revalidation')

// ── propiedad type ─────────────────────────────────────────────────────

;(function testPropiedadWithoutSlug() {
  const tags = getRevalidationTags({ _type: 'propiedad' })
  assert.deepEqual(tags, ['propiedades', 'front-page', 'filters'])
})()

;(function testPropiedadWithSlug() {
  const tags = getRevalidationTags({
    _type: 'propiedad',
    slug: { current: 'casa-en-la-playa' },
  })
  assert.deepEqual(tags, [
    'propiedades',
    'front-page',
    'filters',
    'propiedad:casa-en-la-playa',
  ])
})()

console.log('propiedad (with/without slug): OK')

// ── paginas type ───────────────────────────────────────────────────────

;(function testPaginas() {
  const tags = getRevalidationTags({ _type: 'paginas' })
  assert.deepEqual(tags, ['pages'])
})()

console.log('paginas: OK')

// ── operacion / tipo / localizacion types ──────────────────────────────

;(function testTaxonomyTypes() {
  for (const _type of ['operacion', 'tipo', 'localizacion']) {
    const tags = getRevalidationTags({ _type })
    assert.deepEqual(tags, ['filters', 'propiedades', 'front-page'])
  }
})()

console.log('operacion / tipo / localizacion: OK')

// ── caracteristicas — referenced from Propiedad detail pages ─────────

;(function testCaracteristicasInvalidatesListings() {
  const tags = getRevalidationTags({ _type: 'caracteristicas' })
  assert.ok(
    tags.includes('propiedades'),
    'caracteristicas change should invalidate the listing cache',
  )
})()

console.log('caracteristicas invalidates listing: OK')

// ── unknown type throws ────────────────────────────────────────────────

;(function testUnknownTypeThrows() {
  assert.throws(
    () => {
      getRevalidationTags({ _type: 'algunaCosaRara' })
    },
    /Unknown document type: "algunaCosaRara"/,
  )
})()

console.log('unknown type throws: OK')

// ── missing _type throws ───────────────────────────────────────────────

;(function testMissingTypeThrows() {
  assert.throws(
    () => {
      getRevalidationTags({} as any)
    },
    /Missing _type in webhook document/,
  )
})()

;(function testNullDocumentThrows() {
  assert.throws(
    () => {
      getRevalidationTags(null as any)
    },
    /Missing _type in webhook document/,
  )
})()

console.log('missing _type / null document throws: OK')

console.log('\nAll sanity-revalidation tests passed.')
