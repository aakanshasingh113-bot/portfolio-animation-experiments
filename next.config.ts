import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [400],
    imageSizes: [64, 128, 200, 256, 320, 400],
  },
};

export default nextConfig;
