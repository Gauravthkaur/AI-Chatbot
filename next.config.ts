/** @type {import('next').NextConfig} */
const nextConfig = {
  // A good security practice to not reveal the technology stack.
  poweredByHeader: false,

  // This is a great optimization that helps reduce the bundle size for specific large libraries.
  // It's a good idea to include both of your heavy server-side dependencies here.
  experimental: {
    optimizePackageImports: ['@google/generative-ai', 'mongodb'],
  },
  
  // A standard practice to remove console logs from the production build,
  // cleaning up output and potentially improving performance slightly.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  images: {
    // This is the default setting, keeping Next.js Image Optimization enabled.
    unoptimized: false, 
    
    // SECURITY NOTE: This is acceptable if you only use your own trusted SVG files.
    // Be cautious as it can be a security risk if you display user-uploaded SVGs.
    dangerouslyAllowSVG: true,
  },
};

module.exports = nextConfig;