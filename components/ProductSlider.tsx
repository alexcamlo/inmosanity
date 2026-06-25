'use client'

import { urlForDetail, urlForThumbnail } from '@/lib/sanity.image'
import clsx from 'clsx'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { Image as SanityImage } from 'sanity'
import Shimmer from './Shimmer'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'

type PropType = {
  slides: SanityImage[]
  vertical?: boolean
}

const ProductSlider = ({ slides, vertical }: PropType) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mainViewportRef, embla] = useEmblaCarousel({ skipSnaps: false })
  const [thumbViewportRef, emblaThumbs] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
    axis: vertical ? 'x' : 'y',
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
    // Subscribe to events - 'init' handles initial state, 'select' handles user interaction
    embla.on('init', onSelect)
    embla.on('reInit', onSelect)
    embla.on('select', onSelect)
    return () => {
      embla.off('init', onSelect)
      embla.off('reInit', onSelect)
      embla.off('select', onSelect)
    }
  }, [embla, onSelect])

  const formattedSlides = slides.map((slide) => {
    return {
      sourceUrl: urlForDetail(slide),
      thumbUrl: urlForThumbnail(slide),
      title: slide.asset?._ref,
    }
  })

  return (
    <div className={clsx('flex w-full gap-4', vertical && 'flex-col')}>
      <div
        className={clsx(
          'embla relative m-0 block w-full overflow-hidden rounded p-0',
          !vertical && 'order-2 '
        )}
      >
        <div className='embla__viewport w-full' ref={mainViewportRef}>
          <div className='embla__container xoverflow-x-hidden flex h-full gap-2'>
            {formattedSlides.map((slide, index) => (
              <div className='embla__slide min-w-full' key={index}>
                <div className='embla__slide__inner relative aspect-[3/2] h-full overflow-hidden rounded'>
                  <Dialog>
                    <DialogTrigger>
                      <Image
                        className='embla__slide__img relative block rounded object-cover'
                        src={slide.sourceUrl}
                        alt={slide.title ? slide.title : ''}
                        fill
                        sizes='(max-width: 1024px) 100vw, 75vw'
                        placeholder='blur'
                        blurDataURL={Shimmer}
                        unoptimized
                        {...(index === 0 ? { priority: true } : {})}
                      />
                    </DialogTrigger>
                    <DialogContent className='aspect-[3/2] h-auto w-full self-center lg:max-w-4xl'>
                      <Image
                        className='embla__slide__img relative block rounded object-cover'
                        src={slide.sourceUrl}
                        alt={slide.title ? slide.title : ''}
                        fill
                        sizes='(max-width: 1024px) 90vw, 80vw'
                        placeholder='blur'
                        blurDataURL={Shimmer}
                        unoptimized
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={clsx(
          'embla embla--thumb relative m-0 block overflow-hidden p-0',
          vertical && 'w-full',
          !vertical && 'order-1 w-40'
        )}
      >
        <div
          className={clsx('embla__viewport w-full', !vertical && 'h-full')}
          ref={thumbViewportRef}
        >
          <div
            className={clsx(
              'embla__container embla__container--thumb xh-full flex gap-1',
              !vertical && 'flex-col gap-1'
            )}
          >
            {formattedSlides.map((slide, index) => (
              <div
                key={index}
                className={clsx(
                  'embla__slide embla__slide--thumb aspect-[3/2] w-1/5 shrink-0 rounded transition-opacity',
                  index == selectedIndex && 'is-selected opacity-100',
                  !(index == selectedIndex) && 'opacity-75',
                  !vertical && 'w-full'
                )}
              >
                <button
                  onClick={() => onThumbClick(index)}
                  className={clsx(
                    'embla__slide__inner embla__slide__inner--thumb relative block aspect-[3/2] w-full overflow-hidden rounded border-2',
                    index == selectedIndex
                      ? 'border-green-500'
                      : 'border-transparent'
                  )}
                  type='button'
                >
                  <Image
                    className='embla__slide__thumbnail  relative block rounded object-cover'
                    src={slide.thumbUrl}
                    alt={slide.title ? slide.title : ''}
                    fill
                    sizes='(max-width: 1024px) 20vw, 160px'
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

export default ProductSlider
