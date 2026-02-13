import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/*': ['./ad-docs/**/*'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
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
