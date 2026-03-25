/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**.s3.ap-south-1.amazonaws.com' },
      { protocol: 'https', hostname: 'picoso.in' },
      { protocol: 'http', hostname: 'picoso.in' },
    ],
  },
};

module.exports = nextConfig;
