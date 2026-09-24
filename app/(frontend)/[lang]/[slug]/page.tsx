import { Locale, i18n } from '@/i18n-config'
import { getAllPagesSlug, getPageBySlug } from '@/lib/sanity.client'
import { getLegalNoticeMetadata } from '@/lib/site-metadata'
import { PortableText } from '@portabletext/react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{
    slug: string
    lang: Locale
  }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { lang, slug } = await props.params
  return slug === 'aviso-legal' ? getLegalNoticeMetadata(lang) : {}
}

export default async function Page(props: Props) {
  const params = await props.params;

  const {
    slug,
    lang
  } = params;

  const pageData = getPageBySlug(slug, lang)
  const page = await pageData

  if (slug !== 'aviso-legal') {
    redirect(`/${lang}/propiedades?operacion=operacion-${slug}`)
  }

  return (
    <article className='prose prose-zinc mx-auto px-4 py-12'>
      <PortableText value={page.content} />
    </article>
  )
}

export async function generateStaticParams() {
  const slugs = await getAllPagesSlug()
  const locales = i18n.locales

  const params = locales!.flatMap((locale) => {
    return slugs!.map((slug) => {
      return { lang: locale, slug: slug }
    })
  })

  return params
}
