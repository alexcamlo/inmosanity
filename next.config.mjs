/** @type {import('next').NextConfig} */
const config = {
  // @TODO turn swcMinify back on once the agressive dead code elimination bug that casues
  // `ReferenceError: FieldPresenceWithOverlay is not defined` is fixed
  swcMinify: false,
  images: {
    remotePatterns: [{ hostname: 'cdn.sanity.io' }],
    formats: ['image/webp'],
    deviceSizes: [360, 640, 768, 1024, 1280],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  //  typescript: {
  // Set this to false if you want production builds to abort if there's type errors
  //    ignoreBuildErrors: process.env.VERCEL_ENV === 'production',
  //  },
  //  eslint: {
  /// Set this to false if you want production builds to abort if there's lint errors
  //    ignoreDuringBuilds: process.env.VERCEL_ENV === 'production',
  //  },
}

export default config
