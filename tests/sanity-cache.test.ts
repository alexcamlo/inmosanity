const assert = require('node:assert/strict')

// No Sanity env vars needed — this module is pure logic.

const {
  CONTENT_POLICIES,
  getCacheOptions,
  getPolicyOptions,
  getSearchListingOptions,
  getPropertyDetailOptions,
} = require('../lib/sanity.cache')

// ── Named content policies ────────────────────────────────────────────

function testNamedPolicy(key, expectedRevalidate, expectedTags) {
  const policy = CONTENT_POLICIES[key]
  assert.ok(policy, `Policy "${key}" should exist`)
  assert.equal(policy.revalidate, expectedRevalidate, `${key}.revalidate`)
  assert.deepEqual(policy.tags, expectedTags, `${key}.tags`)

  const opts = getPolicyOptions(key)
  assert.equal(
    opts.next.revalidate,
    expectedRevalidate,
    `${key} opts.revalidate`
  )
  assert.deepEqual(opts.next.tags, expectedTags, `${key} opts.tags`)
}

testNamedPolicy('front-page', 86400, ['front-page'])
testNamedPolicy('filters', 86400, ['filters'])
testNamedPolicy('propiedades', 86400, ['propiedades'])
testNamedPolicy('pages', 86400, ['pages'])
console.log('Named content policies: OK')

// ── getCacheOptions from policy object ────────────────────────────────

{
  const policy = { revalidate: 3600, tags: ['foo', 'bar'] }
  const opts = getCacheOptions(policy)
  assert.equal(opts.next.revalidate, 3600)
  assert.deepEqual(opts.next.tags, ['foo', 'bar'])
  // Must return a copy, not the original array reference
  assert.notEqual(opts.next.tags, policy.tags)
}
console.log('getCacheOptions: OK')

// ── getSearchListingOptions — empty params => cached ──────────────────

{
  const opts = getSearchListingOptions({})
  assert.equal(opts.next.revalidate, 86400)
  assert.deepEqual(opts.next.tags, ['propiedades'])
}

{
  const opts = getSearchListingOptions(undefined)
  assert.equal(opts.next.revalidate, 86400)
  assert.deepEqual(opts.next.tags, ['propiedades'])
}

{
  const opts = getSearchListingOptions({ operacion: 'operacion-en-venta' })
  assert.equal(opts.next.revalidate, 86400)
  assert.deepEqual(opts.next.tags, ['propiedades'])
}
console.log('getSearchListingOptions empty/default => cached: OK')

// ── getSearchListingOptions — with filters => no-store ────────────────

{
  const opts = getSearchListingOptions({ tipo: 'casa' })
  assert.equal(opts.cache, 'no-store')
  assert.equal(opts.next, undefined)
}

{
  const opts = getSearchListingOptions({
    precioMin: '100000',
    precioMax: '300000',
  })
  assert.equal(opts.cache, 'no-store')
}
console.log('getSearchListingOptions with filters => no-store: OK')

// ── getPropertyDetailOptions ──────────────────────────────────────────

{
  const opts = getPropertyDetailOptions('mi-casa')
  assert.equal(opts.next.revalidate, 86400)
  assert.deepEqual(opts.next.tags, ['propiedades', 'propiedad:mi-casa'])
}
console.log('getPropertyDetailOptions: OK')

// ── Combined filters query string contains all expected aliases ───────

{
  const { filtersDropdownQuery } = require('../lib/sanity.queries')
  const q = filtersDropdownQuery

  const expectedAliases = [
    'operacionDD',
    'tipoDD',
    'localizacionDD',
    'priceRentDD',
    'priceSaleDD',
    'bathroomsDD',
    'bedroomsDD',
    'total',
  ]

  for (const alias of expectedAliases) {
    const found = q.includes(`"${alias}"`)
    assert.ok(found, `Combined query should contain "${alias}"`)
  }
  console.log('Combined filters query aliases: OK')
}

console.log('\nAll sanity-cache tests passed.')
