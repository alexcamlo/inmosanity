import ProductSlider from '@/components/ProductSlider'
import BackButton from '@/components/ui/BackButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BathtubIcon,
  BedIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  EnvelopeSimpleIcon,
  MapPinIcon,
  PhoneIcon,
  RulerIcon,
  WhatsappLogoIcon,
} from '@/components/ui/icons'
import Pill from '@/components/ui/Pill'
import { getDictionary } from '@/get-dictionary'
import { i18n, Locale } from '@/i18n-config'
import {
  getPropertyFacts,
  getPropertyLocationDisplay,
  getPropertyPriceDisplay,
} from '@/lib/property-presentation'
import type { PropertyDetailProjection } from '@/lib/property-projection'
import clsx from 'clsx'
import { getAllPropiedadesSlug, getPropiedadBySlug } from 'lib/sanity.client'

export default async function Propiedad(props: {
  params: Promise<{ lang: Locale; slug: string }>
}) {
  const params = await props.params
  const dict = await getDictionary(params.lang)
  const propiedadData = getPropiedadBySlug(params.lang, params.slug)
  const propiedad = (await propiedadData) as PropertyDetailProjection

  const price = getPropertyPriceDisplay(propiedad, 'detail', dict)
  const location = getPropertyLocationDisplay(propiedad)
  const facts = getPropertyFacts(propiedad, 'detail')

  return (
    <div className=' py-4 sm:py-4'>
      <div
        className={clsx(
          'relative mx-auto max-w-5xl lg:pb-4 ',
          propiedad.images && propiedad.images.length == 0 && 'pt-4'
        )}
      >
        <BackButton>{dict.atras}</BackButton>
      </div>

      <div
        className={clsx(
          'relative mx-auto mb-24 grid max-w-5xl auto-rows-auto grid-cols-1 gap-4 bg-white pb-12 text-zinc-800 shadow-md lg:grid-cols-2 lg:gap-y-10 lg:px-6 lg:pt-4',
          propiedad.images && propiedad.images.length == 0 && 'pt-4'
        )}
      >
        {propiedad.images && propiedad.images.length > 0 && (
          <div className='relative flex flex-col md:flex-row md:items-start md:gap-2 lg:-col-end-1 lg:row-span-3'>
            <Pill>{propiedad.operacion.name.toUpperCase()}</Pill>
            <div className='sliderContainer lg:px4 relative flex grow items-center justify-center overflow-x-hidden'>
              <ProductSlider
                vertical
                key={propiedad.slug}
                slides={propiedad.images}
              />
            </div>
          </div>
        )}

        <div className='flex basis-5/12 flex-col gap-4 px-4 lg:row-start-1 '>
          <div
            className={clsx(
              'flex items-center gap-4',
              !(propiedad.images && propiedad.images.length > 0) && 'pt-10'
            )}
          >
            {propiedad.images && propiedad.images.length > 0 ? (
              ''
            ) : (
              <Pill>{propiedad.operacion.name.toUpperCase()}</Pill>
            )}
            <h1 className='grow text-xl font-semibold tracking-wide'>
              {propiedad.title}
            </h1>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='hidden h-10 items-center justify-center gap-1 rounded-md bg-gradient-to-b from-green-500 via-green-600  via-60% to-green-700 px-4 font-medium text-white shadow-button hover:translate-y-1 hover:shadow active:from-green-600 active:via-green-600 active:to-green-600 sm:inline-flex '>
                  {dict.contactar_button}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className='w-fit'>
                <div className='flex w-full justify-start gap-3'>
                  <a
                    className='grid h-10 w-10 place-items-center rounded-full text-green-600 hover:bg-green-50'
                    aria-label={dict.header.email}
                    href={`mailto:info@inmogolfbonalba.com?subject=${dict.footer.contacto.contacto_label}%3A%20${propiedad.title}`}
                  >
                    <EnvelopeSimpleIcon size={28} />
                  </a>

                  <a
                    className='grid h-10 w-10 place-items-center rounded-full text-green-600 hover:bg-green-50'
                    aria-label='Whatsapp'
                    href='https://wa.me/34655849409'
                  >
                    <WhatsappLogoIcon size={28} />
                  </a>

                  <a
                    href='tel:+34655849409'
                    className='grid h-10 w-10 place-items-center rounded-full text-green-600 hover:bg-green-50'
                  >
                    <PhoneIcon size={28} />
                  </a>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className='hidden sm:block'>
            <span className='text-2xl font-bold text-zinc-900 '>
              {price.price}
            </span>
            {price.rentSuffix && (
              <span className='font-medium text-zinc-700 '>
                {price.rentSuffix}
              </span>
            )}
          </div>
          <div className='mb-2 flex flex-col gap-1'>
            <div className='flex items-center gap-1 text-lg text-zinc-500'>
              <BuildingsIcon size={24} weight='duotone' color='currentColor' />
              <span className='text-md  capitalize text-zinc-800'>
                {propiedad.tipo}
              </span>
            </div>

            <div className='flex items-center gap-1 text-lg text-zinc-500'>
              <MapPinIcon size={24} weight='duotone' color='currentColor' />
              <div className='capitalize text-zinc-800'>
                {location.parent && <span>{location.parent} - </span>}
                <span>{location.child}</span>
              </div>
            </div>
          </div>

          <div className='grid grid-flow-col grid-rows-1 border-y border-zinc-300 py-4'>
            {facts.map((fact) => {
              if (fact.key === 'bedrooms') {
                return (
                  <div
                    key={fact.key}
                    className='flex items-center justify-center gap-1'
                  >
                    <BedIcon size={20} weight='duotone' color='currentColor' />
                    <span className='text-md  text-zinc-800'>{fact.value}</span>
                  </div>
                )
              }
              if (fact.key === 'bathrooms') {
                return (
                  <div
                    key={fact.key}
                    className='flex items-center justify-center gap-1'
                  >
                    <BathtubIcon
                      size={20}
                      weight='duotone'
                      color='currentColor'
                    />
                    <span className='text-md  text-zinc-800'>{fact.value}</span>
                  </div>
                )
              }
              if (fact.key === 'size') {
                return (
                  <div
                    key={fact.key}
                    className='flex items-center justify-center gap-1'
                  >
                    <RulerIcon
                      size={20}
                      weight='duotone'
                      color='currentColor'
                    />
                    <span className='text-md'>{fact.value}</span>
                    <span className=''>
                      m<sup className='font-features sups'>2</sup>
                    </span>
                  </div>
                )
              }
              if (fact.key === 'year') {
                return (
                  <div
                    key={fact.key}
                    className='flex items-center justify-center gap-1'
                  >
                    <CalendarBlankIcon
                      size={20}
                      weight='duotone'
                      color='currentColor'
                    />
                    <span className=''>{fact.value}</span>
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>

        {propiedad.caracteristicas && (
          <div className='mx-4 my-6 lg:col-start-1 lg:my-0'>
            <div className='rounded-lg border-2 border-zinc-100 bg-zinc-50 p-2'>
              <ul className='flex flex-1 list-inside list-none flex-wrap justify-center gap-4 p-2 capitalize'>
                {propiedad.caracteristicas.map((caracteristica, index) => (
                  <li key={index} className='flex items-center gap-1'>
                    <svg
                      className='h-3 w-3 fill-emerald-600 stroke-emerald-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
                      />
                    </svg>
                    {caracteristica.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {propiedad.description && (
          <div className='mx-4 text-lg font-normal lg:col-start-1'>
            {propiedad.description}
          </div>
        )}
      </div>
      <div className='fixed inset-x-0 bottom-0 m-2 flex items-center justify-around rounded-xl border-2 border-white bg-white/60 p-4 shadow-xl backdrop-blur sm:hidden md:hidden'>
        {propiedad.price && (
          <div className='flex grow items-baseline'>
            <span className='text-2xl font-bold text-zinc-900 '>
              {price.price}
            </span>
            {price.rentSuffix && (
              <span className='mt-4 font-medium text-zinc-700 '>
                {price.rentSuffix}
              </span>
            )}
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='flex h-10 grow items-center justify-center gap-1 rounded-md bg-gradient-to-b from-green-500 via-green-600  via-60% to-green-700 px-4 font-medium text-white shadow-button hover:translate-y-1 hover:shadow active:from-green-600 active:via-green-600 active:to-green-600 sm:inline-flex '>
              {dict.contactar_button}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className='w-fit'>
            <div className='flex w-full justify-start gap-3'>
              <a
                className='grid h-10 w-10 place-items-center rounded-full text-green-600 hover:bg-green-50'
                aria-label={dict.header.email}
                href={`mailto:info@inmogolfbonalba.com?subject=${dict.footer.contacto.contacto_label}%3A%20${propiedad.title}`}
              >
                <EnvelopeSimpleIcon size={28} />
              </a>

              <a
                className='grid h-10 w-10 place-items-center rounded-full text-green-600 hover:bg-green-50'
                aria-label='Whatsapp'
                href='https://wa.me/34655849409'
              >
                <WhatsappLogoIcon size={28} />
              </a>

              <a
                href='tel:+34655849409'
                className='grid h-10 w-10 place-items-center rounded-full text-green-600 hover:bg-green-50'
              >
                <PhoneIcon size={28} />
              </a>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
export async function generateStaticParams() {
  const slugs = await getAllPropiedadesSlug()
  const locales = i18n.locales

  const params = locales!.flatMap((locale) => {
    return slugs.map((slug) => {
      return { lang: locale, slug: slug.slug }
    })
  })

  return params
}
