import { Locale } from '@/i18n-config'
import { urlForCard } from '@/lib/sanity.image'
import { formatEUR } from '@/lib/utils'
import { Dict, Propiedad } from 'lib/interfaces'
import Image from 'next/image'
import Link from 'next/link'
import Pill from './Pill'
import {
  BathtubIcon,
  BedIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  MapPinIcon,
  RulerIcon,
} from './icons'

type Props = {
  params: { lang: Locale }
  propiedad: Propiedad
  dict: Dict
}

export default function PropiedadCard({ params, dict, propiedad }: Props) {
  return (
    <Link
      key={propiedad.slug}
      href={`/${params.lang}/propiedad/${propiedad.slug}`}
    >
      <div className='relative isolate  flex flex-col gap-4 rounded-md bg-white pb-6 text-slate-800 shadow-md'>
        <Pill>{propiedad.operacion.name}</Pill>
        <div className='relative aspect-[2.78/2] w-full overflow-hidden rounded-t-md '>
          {propiedad.coverImage && (
            <Image
              src={urlForCard(propiedad.coverImage)}
              alt={propiedad.title}
              fill
              unoptimized
            />
          )}
        </div>

        <div className='px-4'>
          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between gap-4 sm:justify-start'>
              <h3 className=' text-xl font-semibold tracking-wide text-slate-900 '>
                <div className='relative flex items-center gap-2'>
                  <span className='font-bold '>
                    {formatEUR(Number(propiedad.price))}
                  </span>
                  {propiedad.operacion.value === 'operacion-en-alquiler' && (
                    <span className='text-xs font-medium '>
                      /{dict.alquiler_tag}
                    </span>
                  )}
                </div>
              </h3>
            </div>

            <div className=' mb-2 flex flex-col gap-1'>
              <div className='flex items-center gap-1 text-lg text-slate-500'>
                <BuildingsIcon size={24} weight='duotone' />
                <span className='capitalize text-slate-700'>
                  {propiedad.tipo}
                </span>
              </div>

              <div className='flex items-center gap-1 text-lg text-slate-500'>
                <MapPinIcon size={24} weight='duotone' />
                <div className='capitalize text-slate-700'>
                  {propiedad.localizacionPadre &&
                    propiedad.localizacionPadre.parent &&
                    propiedad.localizacionPadre.parent.title && (
                      <span>{propiedad.localizacionPadre.parent.title} - </span>
                    )}
                  <span>{propiedad.localizacion}</span>
                </div>
              </div>
            </div>

            <div className='text-md grid grid-flow-col grid-rows-1 border-t border-slate-300 pt-4'>
              {!!propiedad.bedrooms && (
                <div className='flex items-center justify-center gap-1 text-slate-500'>
                  <BedIcon size={20} weight='duotone' />
                  <span className='text-slate-700'>{propiedad.bedrooms}</span>
                </div>
              )}

              {(propiedad.bathrooms || propiedad.bathrooms === 0) && (
                <div className='flex items-center justify-center gap-1 text-slate-500'>
                  <BathtubIcon size={24} weight='duotone' />
                  <span className='text-slate-700'>{propiedad.bathrooms}</span>
                </div>
              )}
              {propiedad.size && (
                <div className='flex items-center justify-center gap-1 text-slate-500'>
                  <RulerIcon size={20} weight='duotone' />
                  <span className='text-md text-slate-700'>
                    {propiedad.size}
                  </span>
                  <span className='text-md text-slate-700'>
                    m<sup className='font-features sups'>2</sup>
                  </span>
                </div>
              )}
              {propiedad.year && (
                <div className='flex items-center justify-center gap-1 text-slate-500'>
                  <CalendarBlankIcon size={20} weight='duotone' />
                  <span className='text-slate-700'>{propiedad.year}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
