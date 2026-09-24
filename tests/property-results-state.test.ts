const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const {
  getPropertyResultsState,
} = require('../lib/search-results-state')
const EmptyPropertyResults =
  require('../components/EmptyPropertyResults').default
const {
  DEFAULT_SEARCH_CRITERIA,
  OPERACION_VENTA,
  serializeSearchCriteria,
} = require('../lib/property-search')

{
  const state = getPropertyResultsState(0, 'en')
  assert.equal(state.kind, 'empty')
  assert.equal(
    state.resetHref,
    `/en/propiedades?${serializeSearchCriteria(DEFAULT_SEARCH_CRITERIA)}`
  )

  const resetUrl = new URL(state.resetHref, 'https://example.com')
  assert.equal(resetUrl.pathname, '/en/propiedades')
  assert.deepEqual(Object.fromEntries(resetUrl.searchParams), {
    operacion: OPERACION_VENTA,
  })
  for (const key of [
    'tipo',
    'localizacion',
    'precioMin',
    'precioMax',
    'banos',
    'habitaciones',
  ]) {
    assert.equal(resetUrl.searchParams.has(key), false)
  }
}
console.log('zero results state uses canonical default-sale reset URL: OK')

{
  for (const count of [1, 2, 50]) {
    const state = getPropertyResultsState(count, 'es')
    assert.deepEqual(state, { kind: 'results' })
    assert.equal('resetHref' in state, false)
  }
}
console.log('non-empty counts preserve results state: OK')

{
  for (const count of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    assert.throws(
      () => getPropertyResultsState(count, 'es'),
      {
        name: 'RangeError',
        message: 'resultCount must be a non-negative integer',
      }
    )
  }
}
console.log('invalid result counts are rejected: OK')

{
  const html = renderToStaticMarkup(
    React.createElement(EmptyPropertyResults, {
      heading: 'No properties found',
      message: 'Try broadening or clearing your filters.',
      actionLabel: 'Clear filters',
      resetHref: '/en/propiedades?operacion=operacion-en-venta',
    })
  )

  assert.match(html, /<h2[^>]*>No properties found<\/h2>/)
  assert.match(html, /<p[^>]*>Try broadening or clearing your filters\.<\/p>/)
  assert.match(html, />Clear filters<\/a>/)
  assert.match(
    html,
    /href="\/en\/propiedades\?operacion=operacion-en-venta"/
  )
  assert.match(html, /bg-green-700/)
  assert.match(html, /hover:bg-green-800/)
  assert.match(html, /focus-visible:ring-2/)
}
console.log('empty-state server markup is semantic and focus-visible: OK')

console.log('\nAll property-results-state tests passed.')
