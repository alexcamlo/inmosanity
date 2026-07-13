/*
 * Unit tests for the revalidation handler.
 *
 * The route handler is exercised through `runRevalidateHandler` with
 * injected fakes so no real Sanity secret, signature, or `revalidateTag`
 * is required. The production `POST` in `app/api/revalidate/route.ts`
 * is verified by hand and is out of scope for these unit tests.
 *
 * Sequential awaited `main()` keeps the test deterministic and
 * propagates the first failure to the process exit code.
 */
import assert from 'node:assert/strict'

import {
  type GetSecretFn,
  type Logger,
  type ParseBodyFn,
  type ParseBodyResult,
  type RevalidateHandlerDeps,
  type RevalidateTagFn,
  type RevalidationDocument,
  type RevalidationTagsFn,
  runRevalidateHandler,
} from '../lib/revalidate.handler'

const TEST_SECRET = 'test-secret'

type ParseBodyCall = {
  request: unknown
  secret: string
  waitForContentLakeEventualConsistency: true
}
type RevalidateTagCall = { tag: string; profile: 'max' }
type LogCall = unknown[]

interface FakesOptions {
  secret?: string | undefined
  parseBody?: ParseBodyFn
  revalidateTag?: RevalidateTagFn
  tags?: RevalidationTagsFn
}

interface Fakes {
  parseBodyCalls: ParseBodyCall[]
  revalidateTagCalls: RevalidateTagCall[]
  revalidationTagsCalls: RevalidationDocument[]
  logCalls: LogCall[]
  deps: RevalidateHandlerDeps
}

function createFakes(opts: FakesOptions = {}): Fakes {
  const parseBodyCalls: ParseBodyCall[] = []
  const revalidateTagCalls: RevalidateTagCall[] = []
  const revalidationTagsCalls: RevalidationDocument[] = []
  const logCalls: LogCall[] = []
  const parseBodyImpl: ParseBodyFn =
    opts.parseBody ??
    (async () => {
      const result: ParseBodyResult = {
        isValidSignature: true,
        body: { _type: 'propiedad' },
      }
      return result
    })
  const parseBody: ParseBodyFn = async (
    request,
    secret,
    waitForContentLakeEventualConsistency
  ) => {
    parseBodyCalls.push({
      request,
      secret,
      waitForContentLakeEventualConsistency,
    })
    return parseBodyImpl(
      request,
      secret,
      waitForContentLakeEventualConsistency
    )
  }
  const revalidateTagImpl: RevalidateTagFn = opts.revalidateTag ?? (() => {})
  const revalidateTag: RevalidateTagFn = (tag, profile) => {
    revalidateTagCalls.push({ tag, profile })
    revalidateTagImpl(tag, profile)
  }
  const tagsImpl: RevalidationTagsFn =
    opts.tags ?? (() => ['propiedades', 'front-page', 'filters'])
  const tags: RevalidationTagsFn = (document) => {
    revalidationTagsCalls.push(document)
    return tagsImpl(document)
  }
  const secret = Object.prototype.hasOwnProperty.call(opts, 'secret')
    ? opts.secret
    : TEST_SECRET
  const getSecret: GetSecretFn = () => secret
  const logger: Logger = {
    error: (...args: unknown[]) => {
      logCalls.push(args)
    },
  }
  return {
    parseBodyCalls,
    revalidateTagCalls,
    revalidationTagsCalls,
    logCalls,
    deps: {
      parseBody,
      revalidateTag,
      getRevalidationTags: tags,
      getSecret,
      logger,
    },
  }
}

interface FakeRequest {
  text: () => Promise<string>
  json: () => Promise<Record<string, unknown>>
}

function fakeRequest(bodyText = ''): FakeRequest {
  return {
    text: async () => bodyText,
    json: async () => (bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {}),
  }
}

async function testMissingSecret(): Promise<void> {
  const fakes = createFakes({ secret: undefined })
  const result = await runRevalidateHandler(
    fakeRequest() as unknown as Parameters<typeof runRevalidateHandler>[0],
    fakes.deps,
  )
  assert.equal(result.status, 500)
  assert.deepEqual(result.body, {
    message: 'Revalidation secret not configured',
    revalidated: false,
  })
  assert.equal(fakes.parseBodyCalls.length, 0)
  assert.equal(fakes.revalidateTagCalls.length, 0)
  assert.equal(fakes.logCalls.length, 1)
  const firstLog = fakes.logCalls[0] as unknown[]
  assert.equal(firstLog[0], 'Missing SANITY_REVALIDATE_SECRET environment variable')
  console.log('route missing secret: OK')
}

async function testInvalidSignature(): Promise<void> {
  const fakes = createFakes({
    parseBody: async () => ({ isValidSignature: false, body: null }),
  })
  const request =
    fakeRequest() as unknown as Parameters<typeof runRevalidateHandler>[0]
  const result = await runRevalidateHandler(request, fakes.deps)
  assert.equal(result.status, 401)
  assert.deepEqual(result.body, {
    message: 'Invalid signature',
    revalidated: false,
  })
  assert.equal(fakes.revalidateTagCalls.length, 0)
  assert.equal(fakes.parseBodyCalls.length, 1)
  assert.deepEqual(fakes.parseBodyCalls[0], {
    request,
    secret: TEST_SECRET,
    waitForContentLakeEventualConsistency: true,
  })
  console.log('route invalid signature: OK')
}

async function testNullSignature(): Promise<void> {
  const fakes = createFakes({
    parseBody: async () => ({
      isValidSignature: null,
      body: { _type: 'propiedad' },
    }),
  })
  const result = await runRevalidateHandler(
    fakeRequest() as unknown as Parameters<typeof runRevalidateHandler>[0],
    fakes.deps,
  )
  assert.equal(result.status, 401)
  assert.deepEqual(result.body, {
    message: 'Invalid signature',
    revalidated: false,
  })
  assert.equal(fakes.revalidateTagCalls.length, 0)
  console.log('route null signature: OK')
}

async function testValidSignatureMissingBody(): Promise<void> {
  const fakes = createFakes({
    parseBody: async () => ({ isValidSignature: true, body: null }),
  })
  const result = await runRevalidateHandler(
    fakeRequest() as unknown as Parameters<typeof runRevalidateHandler>[0],
    fakes.deps,
  )
  assert.equal(result.status, 400)
  assert.deepEqual(result.body, {
    message: 'No body',
    revalidated: false,
  })
  assert.equal(fakes.revalidateTagCalls.length, 0)
  console.log('route missing body: OK')
}

async function testValidPropertyBody(): Promise<void> {
  const fakes = createFakes({
    parseBody: async () => ({
      isValidSignature: true,
      body: { _type: 'propiedad', slug: { current: 'casa-x' } },
    }),
    tags: () => ['propiedades', 'front-page', 'filters', 'propiedad:casa-x'],
  })
  const result = await runRevalidateHandler(
    fakeRequest() as unknown as Parameters<typeof runRevalidateHandler>[0],
    fakes.deps,
  )
  assert.equal(result.status, 200)
  assert.equal(result.body.revalidated, true)
  assert.deepEqual(result.body.tags, [
    'propiedades',
    'front-page',
    'filters',
    'propiedad:casa-x',
  ])
  assert.equal(typeof result.body.now, 'number')
  assert.deepEqual(fakes.revalidationTagsCalls, [
    { _type: 'propiedad', slug: { current: 'casa-x' } },
  ])
  assert.deepEqual(fakes.revalidateTagCalls, [
    { tag: 'propiedades', profile: 'max' },
    { tag: 'front-page', profile: 'max' },
    { tag: 'filters', profile: 'max' },
    { tag: 'propiedad:casa-x', profile: 'max' },
  ])
  console.log('route valid property body: OK')
}

async function testUnknownType(): Promise<void> {
  const fakes = createFakes({
    tags: () => {
      throw new Error('Unknown document type: "nope"')
    },
  })
  const result = await runRevalidateHandler(
    fakeRequest() as unknown as Parameters<typeof runRevalidateHandler>[0],
    fakes.deps,
  )
  assert.equal(result.status, 500)
  assert.deepEqual(result.body, {
    message: 'Error revalidating',
    revalidated: false,
  })
  assert.equal(fakes.revalidateTagCalls.length, 0)
  assert.equal(fakes.logCalls.length, 1)
  const firstLog = fakes.logCalls[0] as unknown[]
  const err = firstLog[1] as { message: string }
  assert.match(err.message, /Unknown document type/)
  console.log('route unknown type: OK')
}

async function testInvalidatorException(): Promise<void> {
  const fakes = createFakes({
    revalidateTag: () => {
      throw new Error('cache unavailable')
    },
  })
  const result = await runRevalidateHandler(
    fakeRequest() as unknown as Parameters<typeof runRevalidateHandler>[0],
    fakes.deps,
  )
  assert.equal(result.status, 500)
  assert.deepEqual(result.body, {
    message: 'Error revalidating',
    revalidated: false,
  })
  assert.deepEqual(fakes.revalidateTagCalls, [
    { tag: 'propiedades', profile: 'max' },
  ])
  assert.equal(fakes.logCalls.length, 1)
  console.log('route invalidator exception: OK')
}

async function testParserException(): Promise<void> {
  const fakes = createFakes({
    parseBody: async () => {
      throw new Error('boom')
    },
  })
  const result = await runRevalidateHandler(
    fakeRequest() as unknown as Parameters<typeof runRevalidateHandler>[0],
    fakes.deps,
  )
  assert.equal(result.status, 500)
  assert.deepEqual(result.body, {
    message: 'Error revalidating',
    revalidated: false,
  })
  assert.equal(fakes.revalidateTagCalls.length, 0)
  const message = result.body.message ?? ''
  assert.equal(message.includes('boom'), false)
  assert.equal(fakes.logCalls.length, 1)
  console.log('route parser exception: OK')
}

async function main(): Promise<void> {
  await testMissingSecret()
  await testInvalidSignature()
  await testNullSignature()
  await testValidSignatureMissingBody()
  await testValidPropertyBody()
  await testUnknownType()
  await testInvalidatorException()
  await testParserException()
}

main()
  .then(() => console.log('\nAll revalidate-route tests passed.'))
  .catch((err: unknown) => {
    console.error(err)
    process.exitCode = 1
  })
