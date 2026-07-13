import type { NextRequest } from 'next/server'

export type RevalidationDocument = {
  _type: string
  slug?: { current?: string } | null
}

export type ParseBodyResult = {
  body: RevalidationDocument | null
  isValidSignature: boolean | null
}

export type ParseBodyFn = (
  request: NextRequest,
  secret: string,
  /** Wait for Content Lake eventual consistency before parsing the body. */
  waitForContentLakeEventualConsistency: true
) => Promise<ParseBodyResult>

export type RevalidateTagFn = (tag: string, profile: 'max') => void
export type RevalidationTagsFn = (doc: RevalidationDocument) => string[]
export type GetSecretFn = () => string | undefined
export type Logger = { error: (...args: unknown[]) => void }

export type RevalidateHandlerDeps = {
  parseBody: ParseBodyFn
  revalidateTag: RevalidateTagFn
  getRevalidationTags: RevalidationTagsFn
  getSecret: GetSecretFn
  logger: Logger
}

export type RevalidateResponseBody = {
  message?: string
  revalidated: boolean
  tags?: string[]
  now?: number
}

export type RevalidateHandlerResult = {
  status: 200 | 400 | 401 | 500
  body: RevalidateResponseBody
}

/**
 * Execute the signed webhook flow with explicit production or test
 * dependencies. The public route always supplies the real signature parser.
 */
export async function runRevalidateHandler(
  request: NextRequest,
  deps: RevalidateHandlerDeps
): Promise<RevalidateHandlerResult> {
  const secret = deps.getSecret()

  if (!secret) {
    deps.logger.error('Missing SANITY_REVALIDATE_SECRET environment variable')
    return {
      status: 500,
      body: {
        message: 'Revalidation secret not configured',
        revalidated: false,
      },
    }
  }

  let parsed: ParseBodyResult
  try {
    parsed = await deps.parseBody(request, secret, true)
  } catch (err) {
    deps.logger.error('Revalidation error:', err)
    return {
      status: 500,
      body: { message: 'Error revalidating', revalidated: false },
    }
  }

  if (!parsed.isValidSignature) {
    return {
      status: 401,
      body: { message: 'Invalid signature', revalidated: false },
    }
  }

  if (!parsed.body) {
    return {
      status: 400,
      body: { message: 'No body', revalidated: false },
    }
  }

  try {
    const tags = deps.getRevalidationTags({
      _type: parsed.body._type,
      slug: parsed.body.slug,
    })

    for (const tag of tags) {
      deps.revalidateTag(tag, 'max')
    }

    return {
      status: 200,
      body: { revalidated: true, tags, now: Date.now() },
    }
  } catch (err) {
    deps.logger.error('Revalidation error:', err)
    return {
      status: 500,
      body: { message: 'Error revalidating', revalidated: false },
    }
  }
}
