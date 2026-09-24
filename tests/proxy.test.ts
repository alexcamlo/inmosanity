const assert = require('node:assert/strict')

const { NextRequest } = require('next/server')
const { proxy } = require('../proxy')

// ── helpers ───────────────────────────────────────────────────────────

function run(pathname, search, acceptLanguage) {
  const url = `https://example.com${pathname}${search}`
  const headers = acceptLanguage ? { 'accept-language': acceptLanguage } : undefined
  return proxy(new NextRequest(url, headers ? { headers } : undefined))
}

function locationOf(result) {
  if (result === undefined) return null
  if (typeof result === 'object' && typeof result.headers?.get === 'function') {
    return result.headers.get('location')
  }
  throw new Error(`Unexpected proxy result: ${result}`)
}

function redirectOf(result) {
  const location = locationOf(result)
  assert.notEqual(location, null, 'proxy must return a Location header')
  return new URL(location, 'https://example.com')
}

function searchParamsOf(result) {
  return redirectOf(result).searchParams
}

// ── 1. Root with Spanish negotiation → one canonical locale path ─────

;(function testRootEsCanonical() {
  const result = run('/', '', 'es')
  assert.notEqual(result, undefined, 'root must produce a redirect, not bypass')
  const redirect = redirectOf(result)
  assert.equal(redirect.pathname, '/es', 'pathname must be a single-slash locale')
  assert.equal(
    searchParamsOf(result).toString(),
    '',
    'no empty `?` should remain on root redirect'
  )
  const doubled = (redirect.pathname.match(/\/\//g) || []).length
  assert.equal(doubled, 0, 'locale pathname must not contain double slashes')
})()

console.log('proxy root Spanish → single-slash locale path: OK')

// ── 2. Unlocalized path with multiple query parameters preserved ─────

;(function testPropiedadesQueryPreserved() {
  const result = run(
    '/propiedades',
    '?operacion=operacion-en-alquiler&tipo=tipo-todos',
    'es'
  )
  const redirect = redirectOf(result)
  assert.equal(redirect.pathname, '/es/propiedades', 'locale path uses single slash')
  const params = searchParamsOf(result)
  assert.equal(params.get('operacion'), 'operacion-en-alquiler', 'first param preserved')
  assert.equal(params.get('tipo'), 'tipo-todos', 'second param preserved')
  assert.equal(
    params.toString().split('&').length,
    2,
    'redirect must keep the original number of params (no collapse)'
  )
})()

console.log('proxy preserves multi-param query: OK')

// ── 3. Duplicate keys, empty values, and naked flags preserved ──────

;(function testDuplicateAndEmptyAndFlagPreserved() {
  const result = run('/buscar', '?tag=a&tag=b&empty=&flag', 'es')
  const redirect = redirectOf(result)
  assert.equal(redirect.pathname, '/es/buscar', 'locale path uses single slash')
  const params = searchParamsOf(result)
  assert.deepEqual(
    params.getAll('tag'),
    ['a', 'b'],
    'duplicate keys must round-trip with multiplicity'
  )
  assert.equal(params.get('empty'), '', 'empty value key is preserved')
  assert.equal(params.get('flag'), '', 'naked flag is preserved as empty value')
  assert.equal(
    params.toString().split('&').length,
    4,
    'redirect must keep all four original entries (no merge or drop)'
  )
})()

console.log('proxy preserves duplicate keys, empty values, and naked flags: OK')

// ── 4. Already-localized path → no redirect (bypass) ─────────────────

;(function testAlreadyLocalizedBypass() {
  const result = run(
    '/en/propiedades',
    '?operacion=operacion-en-alquiler',
    'es'
  )
  assert.equal(result, undefined, 'localized path must bypass redirect entirely')
})()

console.log('proxy bypasses already-localized paths: OK')

// ── 5. Studio path still bypassed ────────────────────────────────────

;(function testStudioBypass() {
  const result = run('/studio', '', 'es')
  assert.equal(result, undefined, 'studio path must bypass redirect')
})()

;(function testStudioNestedBypass() {
  const result = run('/studio/structure', '', 'es')
  assert.equal(result, undefined, 'studio nested path must bypass redirect')
})()

console.log('proxy bypasses /studio paths: OK')

// ── 6. Encoded query round-trips through URL ─────────────────────────

;(function testEncodedQueryRoundTrip() {
  const original = 'buscar ciudad con espacios y eñes'
  const encoded = encodeURIComponent(original)
  const result = run('/buscar', `?q=${encoded}`, 'es')
  const params = searchParamsOf(result)
  assert.equal(params.get('q'), original, 'decoded value must equal original')
  const redirect = redirectOf(result)
  assert.equal(redirect.pathname, '/es/buscar', 'locale path uses single slash')
  // Re-parse the raw Location bytes to confirm encoding survives verbatim.
  const expected = `https://example.com/es/buscar?q=${encoded}`
  assert.equal(locationOf(result), expected, 'encoded bytes round-trip in Location header')
})()

console.log('proxy preserves URL-encoded query: OK')

// ── 7. Empty query value preserved (URL clone behavior) ─────────────

;(function testEmptyValuePreserved() {
  const result = run('/propiedades', '?tipo=', 'es')
  const params = searchParamsOf(result)
  assert.equal(
    params.get('tipo'),
    '',
    'empty value key is preserved verbatim through redirect'
  )
  assert.equal(params.toString(), 'tipo=', 'redirect URL keeps the trailing-equals form')
})()

console.log('proxy preserves empty-value query entries: OK')

console.log('\nAll proxy tests passed.')
