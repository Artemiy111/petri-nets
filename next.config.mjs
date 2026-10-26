/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
