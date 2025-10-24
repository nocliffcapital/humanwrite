/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'icons.llamao.fi',
        pathname: '/icons/**',
      },
    ],
  },
}

module.exports = nextConfig

