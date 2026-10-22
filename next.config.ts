import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Public tournament data: admin writes expire it via updateTag immediately;
    // the short revalidate is a safety net across server instances.
    tournament: {
      stale: 30,
      revalidate: 15,
      expire: 3600,
    },
  },
  experimental: {
    serverActions: {
      // Team logos are capped at 1 MB; leave room for multipart overhead
      bodySizeLimit: "1.2mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
