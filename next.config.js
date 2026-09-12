/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ensure webpack handles web workers smoothly
  webpack: (config, { isServer }) => {
    return config;
  },
};

module.exports = nextConfig;
