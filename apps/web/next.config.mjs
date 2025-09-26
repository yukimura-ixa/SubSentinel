/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: true,
    typedRoutes: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
