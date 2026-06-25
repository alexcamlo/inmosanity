const assert = require('node:assert/strict')

// No Sanity env vars needed — this module is pure logic.

const {
  CONTENT_TAGS,
  propiedadSlugTag,
  getPropertyDetailTags,
  getPropiedadesListingTags,
  getFrontPageTags,
  getFilterDropdownTags,
  getPageTags,
  getRevalidationTags,
  ACCEPTED_DOCUMENT_TYPES,
} = require('../lib/content-freshness')

// ── Tag vocabulary is a single source of truth ────────────────────────

{
  // The tag strings are referenced from cache options and webhook
  // revalidation. They are part of the public contract with Next's
  // data cache, so they must not silently change.
  assert.deepEqual(CONTENT_TAGS, {
    frontPage: 'front-page',
    filters: 'filters',
    propiedades: 'propiedades',
    pages: 'pages',
  })
}
console.log('CONTENT_TAGS vocabulary: OK')

// ── Tag construction ──────────────────────────────────────────────────

{
  assert.equal(propiedadSlugTag('casa-en-la-playa'), 'propiedad:casa-en-la-playa')
}
console.log('propiedadSlugTag: OK')

// ── Per-route tag sets ────────────────────────────────────────────────

{
  assert.deepEqual(getFrontPageTags(), ['front-page'])
  assert.deepEqual(getFilterDropdownTags(), ['filters'])
  assert.deepEqual(getPropiedadesListingTags(), ['propiedades'])
  assert.deepEqual(getPageTags(), ['pages'])
  assert.deepEqual(getPropertyDetailTags('casa-x'), [
    'propiedades',
    'propiedad:casa-x',
  ])
}
console.log('Per-route tag sets: OK')

// ── Fetch tags and revalidation tags stay aligned ────────────────────

{
  // Default listing fetch uses 'propiedades'; any Propiedad webhook
  // must invalidate 'propiedades'.
  const listingFetchTags = getPropiedadesListingTags()
  for (const t of listingFetchTags) {
    for (const docType of [
      'propiedad',
      'operacion',
      'tipo',
      'localizacion',
      'caracteristicas',
    ]) {
      const tags = getRevalidationTags({ _type: docType })
      assert.ok(
        tags.includes(t),
        `Webhook for ${docType} should invalidate "${t}" (used at fetch time)`,
      )
    }
  }
}
console.log('Listing fetch tags are invalidated by every Propiedad dependency: OK')

{
  // Front-page fetch uses 'front-page'; Propiedad-related webhooks
  // must invalidate it.
  const frontPageFetchTags = getFrontPageTags()
  for (const docType of ['propiedad', 'operacion', 'tipo', 'localizacion']) {
    const tags = getRevalidationTags({ _type: docType })
    for (const t of frontPageFetchTags) {
      assert.ok(
        tags.includes(t),
        `Webhook for ${docType} should invalidate "${t}" (used at fetch time)`,
      )
    }
  }
}
console.log('Front-page fetch tags are invalidated by Propiedad/taxonomy webhooks: OK')

{
  // Filter dropdown fetch uses 'filters'; taxonomy webhooks must
  // invalidate it.
  const filterFetchTags = getFilterDropdownTags()
  for (const docType of ['propiedad', 'operacion', 'tipo', 'localizacion']) {
    const tags = getRevalidationTags({ _type: docType })
    for (const t of filterFetchTags) {
      assert.ok(
        tags.includes(t),
        `Webhook for ${docType} should invalidate "${t}" (used at fetch time)`,
      )
    }
  }
}
console.log('Filter fetch tags are invalidated by Propiedad/taxonomy webhooks: OK')

{
  // Detail fetch uses 'propiedades' + 'propiedad:<slug>'. A Propiedad
  // webhook for that slug must invalidate both.
  const slug = 'casa-x'
  const detailFetchTags = getPropertyDetailTags(slug)
  const tags = getRevalidationTags({
    _type: 'propiedad',
    slug: { current: slug },
  })
  for (const t of detailFetchTags) {
    assert.ok(
      tags.includes(t),
      `Propiedad webhook for slug "${slug}" should invalidate "${t}" (used at fetch time)`,
    )
  }
}
console.log('Detail fetch tags are invalidated by matching Propiedad webhook: OK')

// ── Accepted document types include all referenced content ───────────

{
  // Every content type whose data is rendered on a Propiedad page
  // must be in the accepted list. Update the catalog when a new
  // referenced document type is added to a Propiedad projection.
  assert.ok(ACCEPTED_DOCUMENT_TYPES.includes('propiedad'))
  assert.ok(ACCEPTED_DOCUMENT_TYPES.includes('operacion'))
  assert.ok(ACCEPTED_DOCUMENT_TYPES.includes('tipo'))
  assert.ok(ACCEPTED_DOCUMENT_TYPES.includes('localizacion'))
  assert.ok(ACCEPTED_DOCUMENT_TYPES.includes('caracteristicas'))
  assert.ok(ACCEPTED_DOCUMENT_TYPES.includes('paginas'))
}
console.log('ACCEPTED_DOCUMENT_TYPES catalog: OK')

// ── caracteristicas dependency on listing cache ───────────────────────

{
  // Detail pages render `caracteristicas[].title` — a change to any
  // feature can affect any propiedad that references it. Webhook
  // payload does not carry reverse references, so we conservatively
  // invalidate the listing tag.
  const tags = getRevalidationTags({ _type: 'caracteristicas' })
  assert.ok(tags.includes('propiedades'))
}
console.log('caracteristicas → listing revalidation: OK')

console.log('\nAll content-freshness tests passed.')
