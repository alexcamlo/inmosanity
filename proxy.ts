import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { i18n } from './i18n-config'

import { match as matchLocale } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'

function getLocale(request: NextRequest): string | undefined {
  // Negotiator expects plain object so we need to transform headers
  const negotiatorHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value))

  // Use negotiator and intl-localematcher to get best locale
  let languages = new Negotiator({ headers: negotiatorHeaders }).languages()
  // @ts-ignore locales are readonly
  const locales: string[] = i18n.locales
  return matchLocale(languages, locales, i18n.defaultLocale)
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Early return for studio routes - critical for avoiding serverless timeout
  if (pathname.startsWith('/studio')) {
    return
  }

  // // `/_next/` and `/api/` are ignored by the watcher, but we need to ignore files in `public` manually.
  // // If you have one

  if (
    [
      '/manifest.json',
      '/favicon.ico',
      '/background.png',
      '/footer_border.svg',
      '/hero-golf.jpg',
      '/hero-golfball.jpg',
      '/Logo_Inmogolf.png',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'es.svg',
      'uk.svg',

      // Your other files in `public`
    ].includes(pathname)
  )
    return

  // Check if there is any supported locale in the pathname
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request)

    // Build the localized pathname with a single separator, regardless of
    // whether the incoming pathname is empty or already starts with a slash.
    const localizedPathname = `/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`

    // Clone the nextUrl and rewrite the pathname; leave the existing
    // (parsed) searchParams intact so order/encoding round-trips exactly.
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = localizedPathname

    return NextResponse.redirect(redirectUrl)
  }
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: [
    '/((?!api|sitemap.xml|robots.txt|_next/static|studio|_next/image|favicon.ico).*)',
  ],
}
