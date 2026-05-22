'use client'

import { Locale } from '@/i18n-config'
import { Featured } from '@/lib/interfaces'
import { urlForFeatured, urlForThumbnail } from '@/lib/sanity.image'
import clsx from 'clsx'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import useMedia from 'use-media'
import Shimmer from './Shimmer'
import Pill from './ui/Pill'

type Props = {
  propiedades: Featured[]
  params: { lang: Locale }
}

const FeaturedSlider = ({ propiedades, params }: Props) => {
  const isBigScreen = useMedia({ minWidth: '1024px' })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mainViewportRef, embla] = useEmblaCarousel({ skipSnaps: false }, [
    Autoplay({
      stopOnMouseEnter: true,
    }),
  ])
  const [thumbViewportRef, emblaThumbs] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
    axis: 'x',
  })

  const onThumbClick = useCallback(
    (index: number) => {
      if (!embla || !emblaThumbs) return
      embla.scrollTo(index)
    },
    [embla, emblaThumbs]
  )

  const onSelect = useCallback(() => {
    if (!embla || !emblaThumbs) return
    setSelectedIndex(embla.selectedScrollSnap())
    emblaThumbs.scrollTo(embla.selectedScrollSnap())
  }, [embla, emblaThumbs, setSelectedIndex])

  useEffect(() => {
    if (!embla) return
    onSelect()
    embla.on('select', onSelect)
  }, [embla, onSelect])

  const formattedSlides = propiedades.map((propiedad) => {
    return {
      sourceUrl: urlForFeatured(propiedad.coverImage),
      thumbUrl: urlForThumbnail(propiedad.coverImage),
      title: propiedad.coverImage.asset?._ref,
    }
  })

  return (
    <div
      className={clsx(
        'grid w-full gap-4',
        isBigScreen ? 'grid-cols-[9.9rem_1fr]' : 'grid-cols-1'
      )}
    >
      <div
        className={clsx(
          'embla relative m-0 block aspect-[3/2] w-full overflow-hidden rounded p-0',
          isBigScreen && 'order-2 '
        )}
      >
        <div
          className='embla__viewport aspect-[3/2] w-full'
          ref={mainViewportRef}
        >
          <div className='embla__container flex h-full gap-2'>
            {propiedades.map((propiedad) => (
              <Link
                key={propiedad.slug}
                href={`/${params.lang}/propiedad/${propiedad.slug}`}
                className='embla__slide  relative aspect-[3/2] min-w-full shrink-0 grow-0 overflow-hidden rounded-md '
              >
                <Pill>{`${propiedad.tipo} - ${propiedad.operacion}`}</Pill>
                {propiedad && propiedad.coverImage && (
                  <Image
                    src={urlForFeatured(propiedad.coverImage)}
                    alt={propiedad.title}
                    placeholder='blur'
                    blurDataURL={Shimmer}
                    fill
                    unoptimized
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div
        className={clsx(
          'embla embla--thumb relative m-0  block h-full overflow-hidden p-0',
          !isBigScreen && 'w-full',
          isBigScreen && 'order-1 '
        )}
      >
        <div
          className={clsx('embla__viewport w-full', isBigScreen && 'h-full')}
          ref={thumbViewportRef}
        >
          <div
            className={clsx(
              'embla__container embla__container--thumb grid gap-1',
              isBigScreen ? `grid-rows-5 ` : `grid-cols-5`
            )}
          >
            {formattedSlides.map((slide, index) => (
              <div
                key={index}
                className={clsx(
                  'embla__slide embla__slide--thumb xw-full aspect-[3/2] rounded transition-opacity',
                  index == selectedIndex &&
                    'is-selected border-2 border-green-500 opacity-100',
                  !(index == selectedIndex) && 'opacity-75',
                  isBigScreen && 'w-full'
                )}
              >
                <button
                  onClick={() => onThumbClick(index)}
                  className='embla__slide__inner embla__slide__inner--thumb relative aspect-[3/2] w-full'
                  type='button'
                >
                  <Image
                    className='embla__slide__thumbnail  relative block rounded object-cover'
                    src={slide.thumbUrl}
                    alt={slide.title ? slide.title : ''}
                    fill
                    unoptimized
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeaturedSlider
