/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允許 iframe 嵌入
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },
  // 確保 ESM 模組可以被正確處理
  experimental: {
    esmExternals: true,
  },
}

module.exports = nextConfig
