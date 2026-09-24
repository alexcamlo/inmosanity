import { getRevalidationTags } from '@/lib/sanity.revalidation'
import { parseBody } from 'next-sanity/webhook'
import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

import { runRevalidateHandler } from '@/lib/revalidate.handler'

/**
 * POST /api/revalidate
 *
 * Sanity webhook handler for on-demand ISR revalidation.
 *
 * Expects a signed webhook payload from Sanity Content Lake.
 * The `SANITY_REVALIDATE_SECRET` environment variable must match
 * the secret configured in the Sanity webhook settings.
 */
export async function POST(request: NextRequest) {
  const result = await runRevalidateHandler(request, {
    parseBody,
    revalidateTag,
    getRevalidationTags,
    getSecret: () => process.env.SANITY_REVALIDATE_SECRET,
    logger: console,
  })

  return NextResponse.json(result.body, { status: result.status })
}
