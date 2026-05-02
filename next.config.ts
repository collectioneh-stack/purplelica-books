import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
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
