/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  transpilePackages: ['firebase'],
  experimental: {
    esmExternals: 'loose',
  },
}
module.exports = nextConfig
