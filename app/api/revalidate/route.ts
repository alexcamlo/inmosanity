import { type NextRequest, NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'
import { revalidateTag } from 'next/cache'
import type { SanityDocument } from '@sanity/types'

import { getRevalidationTags } from '@/lib/sanity.revalidation'

/**
 * POST /api/revalidate
 *
 * Sanity webhook handler for on-demand ISR revalidation.
 *
 * Expects a signed webhook payload from Sanity Content Lake.
 * The `SANITY_REVALIDATE_SECRET` environment variable must match
 * the secret configured in the Sanity webhook settings.
 *
 * On success, purges the relevant cache tags and returns
 * `{ revalidated: true, tags: [...] }`.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET

  if (!secret) {
    console.error('Missing SANITY_REVALIDATE_SECRET environment variable')
    return NextResponse.json(
      { message: 'Revalidation secret not configured', revalidated: false },
      { status: 500 },
    )
  }

  const { body, isValidSignature } = await parseBody<SanityDocument>(
    request,
    secret,
  )

  if (!isValidSignature) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
  }

  if (!body) {
    return NextResponse.json({ message: 'No body' }, { status: 400 })
  }

  const tags = getRevalidationTags({
    _type: body._type,
    slug: body.slug as { current?: string } | null | undefined,
  })

  for (const tag of tags) {
    revalidateTag(tag)
  }

  return NextResponse.json({ revalidated: true, tags })
}
