import createImageUrlBuilder from '@sanity/image-url'
import type { Image } from 'sanity'
import { dataset, projectId } from './env'

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

export const urlForImage = (source: Image) => {
  return imageBuilder.image(source).auto('format').fit('max').url()
}

type Variant = {
  width: number
  quality: number
  fit: 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'min'
}

const variants: Record<string, Variant> = {
  thumbnail: { width: 200, quality: 80, fit: 'crop' },
  card: { width: 600, quality: 80, fit: 'max' },
  featured: { width: 1200, quality: 85, fit: 'max' },
  detail: { width: 1600, quality: 90, fit: 'max' },
  modal: { width: 2000, quality: 95, fit: 'max' },
}

function buildUrl(source: Image, variant: Variant) {
  return imageBuilder
    .image(source)
    .width(variant.width)
    .quality(variant.quality)
    .auto('format')
    .fit(variant.fit)
    .url()
}

export const urlForThumbnail = (source: Image) =>
  buildUrl(source, variants.thumbnail)
export const urlForCard = (source: Image) => buildUrl(source, variants.card)
export const urlForFeatured = (source: Image) =>
  buildUrl(source, variants.featured)
export const urlForDetail = (source: Image) => buildUrl(source, variants.detail)
export const urlForModal = (source: Image) => buildUrl(source, variants.modal)
