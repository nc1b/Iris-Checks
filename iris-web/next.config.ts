import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The model evaluation reads its photo fixtures from disk.
  partialPrefetching: true,
  // Browsers ask for /favicon.ico on their own; serve the app icon instead of a 404.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
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
