import Image from 'next/image'
import { MouseEventHandler } from 'react'

type PropType = {
  selected: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
  imgSrc: string
  imgTitle: string
}

export const Thumb = ({ selected, onClick, imgSrc, imgTitle }: PropType) => (
  <div
    className={`embla__slide embla__slide--thumb aspect-[3/2] w-1/5 shrink-0 rounded transition-opacity ${
      selected ? 'is-selected opacity-100' : 'opacity-75 '
    }`}
  >
    <button
      onClick={onClick}
      className={`embla__slide__inner embla__slide__inner--thumb relative block aspect-[3/2] w-full overflow-hidden rounded border-2 ${
        selected ? 'border-green-500' : 'border-transparent'
      }`}
      type='button'
    >
      <Image
        className='embla__slide__thumbnail  relative block rounded object-cover'
        src={imgSrc}
        alt={imgTitle}
        sizes='(max-width: 420px) 100vw, 420px'
        fill
        priority
      />
    </button>
  </div>
)
