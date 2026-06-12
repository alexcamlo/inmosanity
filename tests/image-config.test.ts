const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  // ── 1. Dynamically import next.config.mjs ────────────────────────────
  let nextConfig
  try {
    nextConfig = await import('../next.config.mjs')
  } catch (e) {
    // Try with full path
    const configPath = path.resolve(__dirname, '..', 'next.config.mjs')
    nextConfig = await import('file://' + configPath)
  }
  const config = nextConfig.default
  const images = config.images

  // ── 2. Assert Unsplash is absent from remotePatterns ──────────────────
  const hostnames = images.remotePatterns.map((rp) => rp.hostname)
  assert.ok(
    !hostnames.includes('source.unsplash.com'),
    'Unsplash should not be in remotePatterns'
  )

  // ── 3. Assert Sanity remains ──────────────────────────────────────────
  assert.ok(
    hostnames.includes('cdn.sanity.io'),
    'Sanity should remain in remotePatterns'
  )

  // ── 4. Assert new image config values ─────────────────────────────────
  assert.deepEqual(
    images.formats,
    ['image/webp'],
    'formats should be ["image/webp"]'
  )
  assert.deepEqual(
    images.deviceSizes,
    [360, 640, 768, 1024, 1280],
    'deviceSizes should match'
  )
  assert.deepEqual(
    images.imageSizes,
    [64, 128, 256, 384],
    'imageSizes should match'
  )
  assert.equal(
    images.minimumCacheTTL,
    60 * 60 * 24 * 30,
    'minimumCacheTTL should be 30 days'
  )

  // ── 5. Assert Hero.tsx has no quality={100} ───────────────────────────
  const heroPath = path.resolve(__dirname, '..', 'components', 'Hero.tsx')
  const heroContent = fs.readFileSync(heroPath, 'utf-8')
  assert.ok(
    !heroContent.includes('quality={100}'),
    'Hero.tsx should not contain quality={100}'
  )

  console.log('Image config test: OK')
}

main().catch((err) => {
  console.error('FAILED:', err.message)
  process.exit(1)
})
