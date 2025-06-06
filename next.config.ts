import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    // Expose GEMINI_API_KEY to the client side
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    MONGODB_URI: process.env.MONGODB_URI
  },
  // Add any other Next.js config options here
};

export default nextConfig;
