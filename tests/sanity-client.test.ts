/**
 * Sanity adapter characterization tests.
 *
 * No network required: the adapter factory accepts a fake fetch client
 * that records every call. This file never imports the real
 * `next-sanity` client. Public Sanity env vars are stubbed so the
 * production `client` import side-effect does not throw before we
 * require the factory.
 */

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= 'test-project'
process.env.NEXT_PUBLIC_SANITY_DATASET ||= 'test-dataset'

const assert = require('node:assert/strict')

const {
  createSanityDataAdapter,
} = require('../lib/sanity.client')
const {
  frontPageQuery,
  filtersDropdownQuery,
  propiedadSlugsQuery,
  propiedadBySlugQuery,
  pageSlugsQuery,
  pageBySlugQuery,
} = require('../lib/sanity.queries')
const {
  getPolicyOptions,
  getPropertyDetailOptions,
  getSearchListingOptions,
} = require('../lib/sanity.cache')
const {
  buildPropertySearchQuery,
  parseSearchParams,
} = require('../lib/property-search')

type FetchOptions = {
  cache?: 'force-cache' | 'no-store'
  next?: { revalidate?: number | false; tags?: string[] }
}

type FetchCall = {
  query: string
  params: Record<string, unknown>
  options?: FetchOptions
}

type FakeClient = {
  calls: FetchCall[]
  fetch: (
    query: string,
    params?: Record<string, unknown>,
    options?: FetchOptions
  ) => Promise<unknown>
}

function createFakeClient(responses: Record<string, unknown>): FakeClient {
  const calls: FetchCall[] = []
  return {
    calls,
    async fetch(query, params = {}, options) {
      calls.push({ query, params, options })
      if (Object.prototype.hasOwnProperty.call(responses, query)) {
        return responses[query]
      }
      return null
    },
  }
}

const minimalListingRecord = (overrides: Record<string, unknown> = {}) => ({
  _id: 'prop-1',
  title: 'Casa Bonita',
  slug: 'casa-bonita',
  price: 250000,
  operacion: { name: 'Venta', value: 'operacion-en-venta' },
  tipo: 'Casa',
  localizacion: 'Bonalba',
  coverImage: { _type: 'image', asset: { _ref: 'image-a' } },
  ...overrides,
})

const minimalDetailRecord = (overrides: Record<string, unknown> = {}) => ({
  ...minimalListingRecord(),
  images: [{ _type: 'image', asset: { _ref: 'image-a' } }],
  caracteristicas: [{ title: 'Piscina' }],
  description: { es: 'descripción', en: 'description' },
  ...overrides,
})

async function main(): Promise<void> {
  // ── getFrontPage ───────────────────────────────────────────────────

  {
    const client = createFakeClient({
      [frontPageQuery]: {
        featured: [
          {
            title: 'Destacada',
            slug: 'destacada',
            coverImage: { _type: 'image', asset: { _ref: 'image-b' } },
            tipo: 'Casa',
            operacion: 'Venta',
          },
        ],
        latest: [
          minimalListingRecord({ _id: 'latest-1' }),
          { _id: 'invalid-latest' },
        ],
      },
    })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getFrontPage('es')

    assert.equal(client.calls.length, 1)
    assert.equal(client.calls[0].query, frontPageQuery)
    assert.deepEqual(client.calls[0].params, { lang: 'es' })
    assert.deepEqual(client.calls[0].options, getPolicyOptions('front-page'))
    assert.equal(out.featured.length, 1)
    assert.equal(out.featured[0].title, 'Destacada')
    assert.equal(out.latest.length, 1)
    assert.equal(out.latest[0]?._id, 'latest-1')
    console.log('adapter getFrontPage happy path: OK')
  }

  {
    const client = createFakeClient({
      [frontPageQuery]: { featured: 'not an array', latest: 'oops' },
    })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getFrontPage('en')
    assert.equal(out.featured.length, 0)
    assert.equal(out.latest.length, 0)
    console.log('adapter getFrontPage malformed response: OK')
  }

  {
    const client = createFakeClient({
      [frontPageQuery]: { featured: null, latest: null },
    })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getFrontPage('es')
    assert.deepEqual(out, { featured: [], latest: [] })
    console.log('adapter getFrontPage empty/null fields: OK')
  }

  // ── getFiltersDropdownValues ───────────────────────────────────────

  {
    const filters = {
      operacionDD: [{ name: 'Venta', value: 'v' }],
      tipoDD: [],
      localizacionDD: [],
      priceRentDD: 0,
      priceSaleDD: 0,
      bedroomsDD: 4,
      bathroomsDD: 3,
      total: 12,
    }
    const client = createFakeClient({ [filtersDropdownQuery]: filters })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getFiltersDropdownValues('es')

    assert.equal(client.calls.length, 1)
    assert.equal(client.calls[0].query, filtersDropdownQuery)
    assert.deepEqual(client.calls[0].params, { lang: 'es' })
    assert.deepEqual(client.calls[0].options, getPolicyOptions('filters'))
    assert.deepEqual(out, filters)
    console.log('adapter getFiltersDropdownValues: OK')
  }

  // ── getSearchProperties ────────────────────────────────────────────

  {
    const records = [minimalListingRecord({ _id: 'a' })]
    const client = createFakeClient({})
    client.fetch = async (query, params = {}, options) => {
      client.calls.push({ query, params, options })
      return records
    }
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getSearchProperties({}, 'es')

    assert.equal(client.calls.length, 1)
    const expected = buildPropertySearchQuery(parseSearchParams({}))
    assert.equal(client.calls[0].query, expected.query)
    assert.deepEqual(client.calls[0].params, {
      ...expected.params,
      lang: 'es',
    })
    assert.deepEqual(client.calls[0].options, getSearchListingOptions({}))
    assert.equal(out.length, 1)
    assert.equal(out[0]?._id, 'a')
    console.log('adapter getSearchProperties default (cached): OK')
  }

  {
    const client = createFakeClient({})
    client.fetch = async (query, params = {}, options) => {
      client.calls.push({ query, params, options })
      return [minimalListingRecord({ _id: 'b' })]
    }
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getSearchProperties(
      { operacion: 'operacion-en-alquiler', tipo: 'casa' },
      'en'
    )

    assert.equal(client.calls.length, 1)
    const rawParams = {
      operacion: 'operacion-en-alquiler',
      tipo: 'casa',
    }
    const expected = buildPropertySearchQuery(parseSearchParams(rawParams))
    assert.equal(client.calls[0].query, expected.query)
    assert.deepEqual(client.calls[0].params, {
      ...expected.params,
      lang: 'en',
    })
    assert.deepEqual(
      client.calls[0].options,
      getSearchListingOptions(rawParams)
    )
    assert.equal(out[0]?._id, 'b')
    console.log('adapter getSearchProperties with filters (no-store): OK')
  }

  {
    const client = createFakeClient({})
    client.fetch = async () => ({ not: 'an array' })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getSearchProperties({ tipo: 'casa' }, 'es')
    assert.equal(out.length, 0)
    console.log('adapter getSearchProperties malformed non-array response: OK')
  }

  // ── getAllPropiedadesSlug ──────────────────────────────────────────

  {
    const client = createFakeClient({
      [propiedadSlugsQuery]: [
        'casa-a',
        'casa-b',
        { current: 'casa-c' },
        null,
      ],
    })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getAllPropiedadesSlug()

    assert.equal(client.calls.length, 1)
    assert.equal(client.calls[0].query, propiedadSlugsQuery)
    assert.deepEqual(client.calls[0].params, {})
    assert.deepEqual(client.calls[0].options, getPolicyOptions('propiedades'))
    assert.deepEqual(out, [
      { slug: 'casa-a' },
      { slug: 'casa-b' },
      { slug: 'casa-c' },
    ])
    console.log('adapter getAllPropiedadesSlug projects mixed slugs: OK')
  }

  {
    const client = createFakeClient({ [propiedadSlugsQuery]: null })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getAllPropiedadesSlug()
    assert.deepEqual(out, [])
    console.log('adapter getAllPropiedadesSlug malformed response: OK')
  }

  // ── getPropiedadBySlug ─────────────────────────────────────────────

  {
    const client = createFakeClient({
      [propiedadBySlugQuery]: minimalDetailRecord({ slug: 'casa-x' }),
    })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getPropiedadBySlug('es', 'casa-x')

    assert.equal(client.calls.length, 1)
    assert.equal(client.calls[0].query, propiedadBySlugQuery)
    assert.deepEqual(client.calls[0].params, { slug: 'casa-x', lang: 'es' })
    assert.deepEqual(
      client.calls[0].options,
      getPropertyDetailOptions('casa-x')
    )
    assert.ok(out)
    assert.equal(out._id, 'prop-1')
    assert.equal(out.slug, 'casa-x')
    assert.equal(out.title, 'Casa Bonita')
    assert.equal(out.operacion.value, 'operacion-en-venta')
    console.log('adapter getPropiedadBySlug valid projection: OK')
  }

  for (const [name, response] of [
    ['null response', null],
    ['missing id', minimalDetailRecord({ _id: '' })],
    ['missing title', minimalDetailRecord({ title: '' })],
    ['missing slug', minimalDetailRecord({ slug: '' })],
  ] as const) {
    const client = createFakeClient({ [propiedadBySlugQuery]: response })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getPropiedadBySlug('en', 'missing-slug')

    assert.equal(out, null, name)
  }
  console.log('adapter getPropiedadBySlug missing/malformed records: OK')

  {
    const client = createFakeClient({})
    const failure = new Error('Sanity unavailable')
    client.fetch = async () => {
      throw failure
    }
    const adapter = createSanityDataAdapter(client)

    await assert.rejects(
      adapter.getPropiedadBySlug('en', 'network-error'),
      (error: unknown) => error === failure
    )
    console.log('adapter getPropiedadBySlug fetch rejection propagates: OK')
  }

  // ── Page getters ───────────────────────────────────────────────────

  {
    const client = createFakeClient({ [pageSlugsQuery]: ['aviso-legal'] })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getAllPagesSlug()

    assert.equal(client.calls.length, 1)
    assert.equal(client.calls[0].query, pageSlugsQuery)
    assert.deepEqual(client.calls[0].params, {})
    assert.deepEqual(client.calls[0].options, getPolicyOptions('pages'))
    assert.deepEqual(out, ['aviso-legal'])
    console.log('adapter getAllPagesSlug: OK')
  }

  {
    const client = createFakeClient({
      [pageBySlugQuery]: { slug: 'aviso-legal', content: [] },
    })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getPageBySlug('aviso-legal', 'es')

    assert.equal(client.calls.length, 1)
    assert.equal(client.calls[0].query, pageBySlugQuery)
    assert.deepEqual(
      client.calls[0].params,
      { slug: 'aviso-legal', lang: 'es' }
    )
    assert.deepEqual(client.calls[0].options, getPolicyOptions('pages'))
    assert.equal(out.slug, 'aviso-legal')
    assert.deepEqual(out.content, [])
    console.log('adapter getPageBySlug: OK')
  }

  {
    const client = createFakeClient({ [pageBySlugQuery]: null })
    const adapter = createSanityDataAdapter(client)
    const out = await adapter.getPageBySlug('aviso-legal', 'es')
    assert.deepEqual(out, { content: [] })
    console.log('adapter getPageBySlug null response: OK')
  }

  console.log('\nAll sanity-client tests passed.')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
