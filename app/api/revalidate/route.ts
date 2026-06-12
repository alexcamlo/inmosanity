import { getRevalidationTags } from '@/lib/sanity.revalidation'
import type { SanityDocument } from '@sanity/types'
import { parseBody } from 'next-sanity/webhook'
import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

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
  const secret = process.env.SANITY_REVALIDATE_SECRET

  if (!secret) {
    console.error('Missing SANITY_REVALIDATE_SECRET environment variable')
    return NextResponse.json(
      { message: 'Revalidation secret not configured', revalidated: false },
      { status: 500 }
    )
  }

  try {
    const { body, isValidSignature } = await parseBody<SanityDocument>(
      request,
      secret,
      true
    )

    if (!isValidSignature) {
      return NextResponse.json(
        { message: 'Invalid signature', revalidated: false },
        { status: 401 }
      )
    }

    if (!body) {
      return NextResponse.json(
        { message: 'No body', revalidated: false },
        { status: 400 }
      )
    }

    const tags = getRevalidationTags({
      _type: body._type,
      slug: body.slug as { current?: string } | null | undefined,
    })

    for (const tag of tags) {
      revalidateTag(tag, 'max')
    }

    return NextResponse.json({ revalidated: true, tags, now: Date.now() })
  } catch (err) {
    console.error('Revalidation error:', err)
    return NextResponse.json(
      { message: 'Error revalidating', revalidated: false },
      { status: 500 }
    )
  }
}
