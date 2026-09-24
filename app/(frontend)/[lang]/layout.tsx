import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { getDictionary } from '@/get-dictionary'
import { Locale } from '@/i18n-config'
import {
  SITE_TITLE_DEFAULT,
  SITE_TITLE_TEMPLATE,
} from '@/lib/site-metadata'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ReactNode } from 'react'
import 'styles/global.css'

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
})

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE_DEFAULT,
    template: SITE_TITLE_TEMPLATE,
  },

  /* description: 'Inmogolf Bonalba, Inmobiliaria en el campo de golf Bonalba', */
  keywords: [
    'Inmobiliaria',
    'Bonalba',
    'Alicante',
    'Alquiler',
    'Compra',
    'Mutxamel',
    'Golf',
  ],
}

type Props = {
  children?: ReactNode
  params: Promise<{ lang: string }>
}

export default async function RootLayout(props: Props) {
  const params = await props.params;

  const {
    children
  } = props;

  const dict = await getDictionary(params.lang as Locale)
  const typedParams = { lang: params.lang as Locale }

  return (
    <html lang={params.lang} className={`${inter.variable}`}>
      <body>
        <div className='flex min-h-screen flex-col'>
          <Header params={typedParams} dict={dict} />
          <main className='relative grow bg-zinc-50'>{children}</main>
          <Footer params={typedParams} dict={dict} />
          <TailwindIndicator />
        </div>
      </body>
    </html>
  )
}

export const viewport = {
  colorScheme: 'light',
  themeColor: '#16a34a'
};
