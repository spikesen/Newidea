/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nexcomm/shared', '@nexcomm/database'],
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;
