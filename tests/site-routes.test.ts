const assert = require('node:assert/strict')

const { getPropertyUrl, getStaticPageUrl } = require('../lib/site-routes')

{
  assert.equal(
    getPropertyUrl('es', { slug: 'casa-en-la-playa' }),
    'https://inmogolfbonalba.com/es/propiedad/casa-en-la-playa'
  )
}
console.log('getPropertyUrl uses slug projection: OK')

{
  assert.equal(
    getStaticPageUrl('en', '/aviso-legal'),
    'https://inmogolfbonalba.com/en//aviso-legal'
  )
}
console.log('getStaticPageUrl preserves existing route formatting: OK')

console.log('\nAll site-routes tests passed.')
