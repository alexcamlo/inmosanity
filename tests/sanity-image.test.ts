const assert = require('node:assert/strict')

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'test-project'
process.env.NEXT_PUBLIC_SANITY_DATASET = 'test-dataset'

const {
  urlForImage,
  urlForThumbnail,
  urlForCard,
  urlForFeatured,
  urlForDetail,
  urlForModal,
} = require('../lib/sanity.image')

const mockImage = {
  _type: 'image',
  asset: {
    _ref: 'image-abc123-2000x3000-jpg',
    _type: 'reference',
  },
}

function assertSanityParams(
  url: string,
  { width, quality, fit }: { width: number; quality: number; fit: string }
) {
  assert.match(url, new RegExp(`w=${width}`))
  assert.match(url, new RegExp(`q=${quality}`))
  assert.match(url, /auto=format/)
  assert.match(url, new RegExp(`fit=${fit}`))
}

assert.match(urlForImage(mockImage), /auto=format/)
assert.match(urlForImage(mockImage), /fit=max/)

assertSanityParams(urlForThumbnail(mockImage), {
  width: 200,
  quality: 80,
  fit: 'crop',
})
assertSanityParams(urlForCard(mockImage), {
  width: 600,
  quality: 80,
  fit: 'max',
})
assertSanityParams(urlForFeatured(mockImage), {
  width: 1200,
  quality: 85,
  fit: 'max',
})
assertSanityParams(urlForDetail(mockImage), {
  width: 1600,
  quality: 90,
  fit: 'max',
})
assertSanityParams(urlForModal(mockImage), {
  width: 2000,
  quality: 95,
  fit: 'max',
})

assert.match(
  urlForThumbnail(mockImage),
  /cdn\.sanity\.io\/images\/test-project\/test-dataset\//
)

console.log('Sanity image URL helpers: OK')
