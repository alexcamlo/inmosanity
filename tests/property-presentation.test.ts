const assert = require('node:assert/strict')

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'test-project'
process.env.NEXT_PUBLIC_SANITY_DATASET = 'test-dataset'

const {
  RENT_OPERACION_VALUE,
  PROPERTY_FACT_KEYS,
  isRent,
  formatPropertyPrice,
  getRentSuffix,
  getPropertyPriceDisplay,
  getPropertyLocationDisplay,
  getPropertyFacts,
  describeProperty,
} = require('../lib/property-presentation')

const { formatEUR } = require('../lib/utils')

// ── Fact key catalog (regression fence) ──────────────────────────────

{
  // Update the catalog only when the visible fact set actually changes.
  assert.deepEqual(
    [...PROPERTY_FACT_KEYS],
    ['bedrooms', 'bathrooms', 'size', 'year'],
  )
}
console.log('PROPERTY_FACT_KEYS catalog: OK')

// ── isRent ───────────────────────────────────────────────────────────

{
  const sale = {
    price: 100000,
    operacion: { name: 'Venta', value: 'operacion-en-venta' },
    localizacion: 'Altea',
  }
  const rent = {
    price: 800,
    operacion: { name: 'Alquiler', value: RENT_OPERACION_VALUE },
    localizacion: 'Altea',
  }
  assert.equal(isRent(sale), false)
  assert.equal(isRent(rent), true)
}
console.log('isRent: OK')

// ── formatPropertyPrice ──────────────────────────────────────────────

{
  const formatted = formatPropertyPrice(150000)
  assert.equal(formatted, formatEUR(150000))
  assert.match(formatted, /\d/)
  assert.match(formatted, /€|EUR/)
}
{
  // Zero / negative are still formatted (no UI-level guard here)
  assert.equal(formatPropertyPrice(0), formatEUR(0))
}
console.log('formatPropertyPrice: OK')

// ── getRentSuffix: scope decision is shared, text differs ────────────

{
  const sale = {
    price: 100000,
    operacion: { name: 'Venta', value: 'operacion-en-venta' },
    localizacion: 'Altea',
  }
  const rent = {
    price: 800,
    operacion: { name: 'Alquiler', value: RENT_OPERACION_VALUE },
    localizacion: 'Altea',
  }
  const dict = { alquiler_tag: 'mes' }

  // No suffix when not renting
  assert.equal(getRentSuffix(sale, 'card', dict), null)
  assert.equal(getRentSuffix(sale, 'detail', dict), null)

  // Card uses the dict tag, detail uses the literal "/mes" label
  assert.equal(getRentSuffix(rent, 'card', dict), '/mes')
  assert.equal(getRentSuffix(rent, 'detail', dict), '/mes')

  // When the dict has a different label, the card reflects it but the
  // detail page does not.
  const dictEn = { alquiler_tag: 'month' }
  assert.equal(getRentSuffix(rent, 'card', dictEn), '/month')
  assert.equal(getRentSuffix(rent, 'detail', dictEn), '/mes')
}
console.log('getRentSuffix: OK')

// ── getPropertyPriceDisplay: bundle price + suffix ───────────────────

{
  const propiedad = {
    price: 250000,
    operacion: { name: 'Venta', value: 'operacion-en-venta' },
    localizacion: 'Altea',
  }
  const dict = { alquiler_tag: 'mes' }
  const display = getPropertyPriceDisplay(propiedad, 'card', dict)
  assert.equal(display.price, formatEUR(250000))
  assert.equal(display.rentSuffix, null)
}
{
  const rent = {
    price: 800,
    operacion: { name: 'Alquiler', value: RENT_OPERACION_VALUE },
    localizacion: 'Altea',
  }
  const dict = { alquiler_tag: 'mes' }
  const display = getPropertyPriceDisplay(rent, 'detail', dict)
  assert.equal(display.price, formatEUR(800))
  assert.equal(display.rentSuffix, '/mes')
}
console.log('getPropertyPriceDisplay: OK')

// ── getPropertyLocationDisplay: parent fallback ──────────────────────

{
  const withParent = {
    price: 0,
    operacion: { name: 'Venta', value: 'operacion-en-venta' },
    localizacion: 'Altea',
    localizacionPadre: { parent: { title: 'Alicante' } },
  }
  assert.deepEqual(getPropertyLocationDisplay(withParent), {
    parent: 'Alicante',
    child: 'Altea',
  })
}
{
  const noParent = {
    price: 0,
    operacion: { name: 'Venta', value: 'operacion-en-venta' },
    localizacion: 'Altea',
  }
  assert.deepEqual(getPropertyLocationDisplay(noParent), {
    parent: null,
    child: 'Altea',
  })
}
{
  const emptyParent = {
    price: 0,
    operacion: { name: 'Venta', value: 'operacion-en-venta' },
    localizacion: 'Altea',
    localizacionPadre: { parent: { title: '' } },
  }
  assert.deepEqual(getPropertyLocationDisplay(emptyParent), {
    parent: null,
    child: 'Altea',
  })
}
{
  const whitespaceParent = {
    price: 0,
    operacion: { name: 'Venta', value: 'operacion-en-venta' },
    localizacion: 'Altea',
    localizacionPadre: { parent: { title: '   ' } },
  }
  assert.deepEqual(getPropertyLocationDisplay(whitespaceParent), {
    parent: null,
    child: 'Altea',
  })
}
console.log('getPropertyLocationDisplay: OK')

// ── getPropertyFacts: visibility rules per scope ─────────────────────

const base = {
  price: 100000,
  operacion: { name: 'Venta', value: 'operacion-en-venta' },
  localizacion: 'Altea',
}

{
  // Card hides 0 bedrooms
  const card = getPropertyFacts({ ...base, bedrooms: 0, bathrooms: 1 }, 'card')
  assert.deepEqual(
    card.map((f) => f.key),
    ['bathrooms'],
  )
}
{
  // Detail shows 0 bedrooms
  const detail = getPropertyFacts(
    { ...base, bedrooms: 0, bathrooms: 1 },
    'detail',
  )
  assert.deepEqual(
    detail.map((f) => f.key),
    ['bedrooms', 'bathrooms'],
  )
  assert.equal(detail[0].value, 0)
}
{
  // Card: 0 bathrooms is shown (matches prior `b || b === 0` gate)
  const card = getPropertyFacts({ ...base, bedrooms: 2, bathrooms: 0 }, 'card')
  assert.deepEqual(
    card.map((f) => f.key),
    ['bedrooms', 'bathrooms'],
  )
  assert.equal(card[1].value, 0)
}
{
  // Both: size and year are hidden when 0 / missing
  const both = getPropertyFacts(
    {
      ...base,
      bedrooms: 2,
      bathrooms: 1,
      size: 0,
      year: undefined,
    },
    'card',
  )
  assert.deepEqual(
    both.map((f) => f.key),
    ['bedrooms', 'bathrooms'],
  )
}
{
  // Both: size and year show when positive
  const both = getPropertyFacts(
    { ...base, bedrooms: 2, bathrooms: 1, size: 90, year: 2010 },
    'detail',
  )
  assert.deepEqual(both, [
    { key: 'bedrooms', value: 2 },
    { key: 'bathrooms', value: 1 },
    { key: 'size', value: 90, unit: 'm²' },
    { key: 'year', value: 2010 },
  ])
}
{
  // Missing fields (undefined) are dropped
  const both = getPropertyFacts(
    { ...base, bedrooms: 2 },
    'card',
  )
  assert.deepEqual(both, [{ key: 'bedrooms', value: 2 }])
}
console.log('getPropertyFacts: OK')

// ── describeProperty: end-to-end shape ───────────────────────────────

{
  const propiedad = {
    price: 800,
    operacion: { name: 'Alquiler', value: RENT_OPERACION_VALUE },
    localizacion: 'Altea',
    localizacionPadre: { parent: { title: 'Alicante' } },
    bedrooms: 2,
    bathrooms: 1,
    size: 80,
    year: 2015,
  }
  const dict = { alquiler_tag: 'mes' }
  const result = describeProperty(propiedad, 'detail', dict)
  assert.equal(result.price.price, formatEUR(800))
  assert.equal(result.price.rentSuffix, '/mes')
  assert.deepEqual(result.location, { parent: 'Alicante', child: 'Altea' })
  assert.equal(result.facts.length, 4)
  assert.equal(result.facts[0].key, 'bedrooms')
  assert.equal(result.facts[3].key, 'year')
}
console.log('describeProperty: OK')

console.log('\nAll property-presentation tests passed.')
