import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/api/*': ['./ad-docs/**/*', './node_modules/sharp/**/*'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "img-src 'self' data: blob: https://images.unsplash.com https://placehold.co https://qunrofzwejafqzssmkpa.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
              "frame-src https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/(login|signup|forgot-password|reset-password)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'qunrofzwejafqzssmkpa.supabase.co' },
    ],
  },
  webpack: (config, { isServer, webpack: wp }) => {
    if (isServer) {
      // Polyfill File for Node 18 (global added in Node 20)
      // Required by @supabase/supabase-js at module load time
      config.plugins.push(
        new wp.BannerPlugin({
          banner: `if(typeof globalThis.File==="undefined"){const{Blob:B}=require("node:buffer");globalThis.File=class extends B{constructor(b,n,o){super(b,o);this.name=n;this.lastModified=o?.lastModified??Date.now()}}}`,
          raw: true,
          entryOnly: false,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
