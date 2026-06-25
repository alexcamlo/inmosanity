const assert = require('node:assert/strict')

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'test-project'
process.env.NEXT_PUBLIC_SANITY_DATASET = 'test-dataset'

const {
  LOCATION_ALL,
  TIPO_ALL,
  OPERACION_ALQUILER,
  OPERACION_VENTA,
  EMPTY_SEARCH_CRITERIA,
  hasActiveFilters,
  parseSearchParams,
  serializeSearchCriteria,
  buildPropertySearchGroq,
  buildPropertySearchQuery,
} = require('../lib/property-search')
const { PROPIEDAD_FIELDS } = require('../lib/sanity.queries')

// ── Default (no filters) — list query, no extra filters ──────────────

{
  const criteria = parseSearchParams({})
  assert.deepEqual(criteria, EMPTY_SEARCH_CRITERIA)
  assert.equal(hasActiveFilters({}), false)
  assert.equal(hasActiveFilters(undefined), false)
  assert.equal(hasActiveFilters(null), false)
}
console.log('parseSearchParams empty: OK')

{
  const criteria = parseSearchParams({ operacion: OPERACION_VENTA })
  assert.deepEqual(criteria, { operacion: OPERACION_VENTA })
  assert.equal(hasActiveFilters({ operacion: OPERACION_VENTA }), false)
}
console.log('parseSearchParams default operacion only: OK')

{
  const { query, params } = buildPropertySearchQuery(parseSearchParams({}))
  assert.match(query, /_type == 'propiedad'/)
  assert.ok(query.includes(PROPIEDAD_FIELDS))
  assert.ok(query.includes('order(_createdAt desc)'))
  assert.deepEqual(params, {})
  // No extra filters should leak in
  assert.equal(query.includes('price >='), false)
  assert.equal(query.includes('bathrooms =='), false)
  assert.equal(query.includes('operacion._ref =='), false)
}
console.log('buildPropertySearchQuery default: OK')

// ── Filtered search — round-trip + numeric coercion ──────────────────

{
  const raw = {
    operacion: OPERACION_ALQUILER,
    tipo: 'tipo-piso',
    localizacion: 'localizacion-1',
    precioMin: '100000',
    precioMax: '300000',
    banos: '2',
    habitaciones: '3',
  }
  const criteria = parseSearchParams(raw)
  assert.equal(criteria.operacion, OPERACION_ALQUILER)
  assert.equal(criteria.tipo, 'tipo-piso')
  assert.equal(criteria.localizacion, 'localizacion-1')
  assert.equal(criteria.precioMin, 100000)
  assert.equal(criteria.precioMax, 300000)
  assert.equal(criteria.banos, 2)
  assert.equal(criteria.habitaciones, 3)
  assert.equal(hasActiveFilters(raw), true)
}
console.log('parseSearchParams filtered + numeric coercion: OK')

{
  const criteria = parseSearchParams({ precioMin: 'abc' })
  assert.equal(criteria.precioMin, undefined)
  assert.equal(hasActiveFilters({ precioMin: 'abc' }), false)
}
console.log('parseSearchParams non-numeric coerces to undefined: OK')

{
  const criteria = parseSearchParams({ banos: ['1', '2'] })
  assert.equal(criteria.banos, 1)
}
console.log('parseSearchParams array values pick first: OK')

// ── Round-trip serialize/parse ───────────────────────────────────────

{
  const original = parseSearchParams({
    operacion: OPERACION_VENTA,
    tipo: 'tipo-casa',
    precioMin: '50000',
    banos: '1',
  })
  const round = parseSearchParams(
    Object.fromEntries(new URLSearchParams(serializeSearchCriteria(original)))
  )
  assert.deepEqual(round, original)
}
console.log('serialize/parse round-trip: OK')

// ── Known filters are parameterized ──────────────────────────────────

function groq(criteria) {
  return buildPropertySearchGroq(parseSearchParams(criteria))
}

{
  const { query, params } = buildPropertySearchQuery(
    parseSearchParams({ operacion: OPERACION_ALQUILER })
  )
  assert.ok(query.includes('operacion._ref == $operacion'))
  assert.deepEqual(params, { operacion: OPERACION_ALQUILER })
}
console.log('operacion filter handling: OK')

{
  const { query, params } = buildPropertySearchQuery(
    parseSearchParams({
      tipo: 'tipo-piso',
      localizacion: 'localizacion-1',
      precioMin: '100000',
      precioMax: '300000',
      banos: '2',
      habitaciones: '3',
    })
  )
  assert.ok(query.includes('tipo._ref == $tipo'))
  assert.ok(query.includes('localizacion._ref == $localizacion'))
  assert.ok(query.includes('price >= $precioMin'))
  assert.ok(query.includes('price <= $precioMax'))
  assert.ok(query.includes('bathrooms == $banos'))
  assert.ok(query.includes('bedrooms == $habitaciones'))
  assert.deepEqual(params, {
    tipo: 'tipo-piso',
    localizacion: 'localizacion-1',
    precioMin: 100000,
    precioMax: 300000,
    banos: 2,
    habitaciones: 3,
  })
}
console.log('Known filter params: OK')

// ── "All" sentinel handling for tipo/localizacion ────────────────────

{
  const query = groq({ tipo: TIPO_ALL })
  assert.ok(
    query.includes(`tipo._ref != '${TIPO_ALL}'`),
    'tipo-todos should produce an exclusion filter'
  )
}

{
  const query = groq({ localizacion: LOCATION_ALL })
  assert.ok(
    query.includes(`localizacion._ref != '${LOCATION_ALL}'`),
    'localizacion-todas should produce an exclusion filter'
  )
  assert.ok(
    query.includes(`localizacion->parent._ref != '${LOCATION_ALL}'`),
    'localizacion-todas should also exclude parent match'
  )
}

{
  const query = groq({ localizacion: 'localizacion-1' })
  assert.ok(
    query.includes(
      '(localizacion._ref == $localizacion || localizacion->parent._ref == $localizacion)'
    ),
    'specific localizacion should match self or parent'
  )
}
console.log('All sentinel handling: OK')

// ── Unknown filters are explicitly ignored ───────────────────────────

{
  const criteria = parseSearchParams({ foo: 'foo-id' })
  assert.deepEqual(criteria, {})
  const { query, params } = buildPropertySearchQuery(criteria)
  assert.equal(query.includes('foo'), false)
  assert.deepEqual(params, {})
}
console.log('Unknown filter handling: OK')

{
  // Empty / array-only / undefined values are dropped
  const query = groq({ tipo: '', banos: undefined, extra: [] })
  assert.equal(query.includes('tipo._ref'), false)
  assert.equal(query.includes('banos'), false)
  assert.equal(query.includes('extra._ref'), false)
}
console.log('Empty value handling: OK')

console.log('\nAll property-search tests passed.')
