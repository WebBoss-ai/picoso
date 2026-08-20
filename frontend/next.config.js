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
  experimental: {
    serverActions: {
      // Required when Next sits behind nginx / a public hostname (avoids
      // "Missing origin header from a forwarded Server Actions request").
      allowedOrigins: ['picoso.in', 'www.picoso.in', 'localhost:3000'],
    },
  },
};

module.exports = nextConfig;
