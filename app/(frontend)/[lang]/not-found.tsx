'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import en from '@/dictionaries/en.json'
import es from '@/dictionaries/es.json'

export default function NotFound() {
  const lang = usePathname().split('/')[1] === 'en' ? 'en' : 'es'
  const copy = lang === 'en' ? en.error : es.error

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-9xl font-bold text-green-600">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-zinc-800">
        {copy.not_found_title}
      </h2>
      <p className="mt-2 max-w-md text-zinc-600">{copy.not_found_message}</p>
      <Link
        href={`/${lang}`}
        className="mt-8 rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
      >
        {copy.go_home}
      </Link>
    </div>
  )
}
