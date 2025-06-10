/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ FIXED: Updated to current Next.js API
  serverExternalPackages: ['mongodb'],
  
  // Optimize for faster responses
  experimental: {
    optimizePackageImports: ['@google/generative-ai'],
  },
  
  // Reduce bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Optimize images and assets
  images: {
    unoptimized: false,
    dangerouslyAllowSVG: true,
  },
  
  // Enable compression
  compress: true,
  poweredByHeader: false,
  
  // Optimize webpack
  webpack: (config: import('webpack').Configuration, { isServer }) => {
    if (isServer) {
      // Optimize server-side bundles
      config.optimization = { ...config.optimization, splitChunks: false };
    }
    return config;
  },
};

module.exports = nextConfig;