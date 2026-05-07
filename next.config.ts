import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
  async rewrites() {
    return [
      {
        source: '/google61df5c33f3fbcd72.html',
        destination: '/api/google-verify',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/translations/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400' }],
      },
    ]
  },
}

export default nextConfig
