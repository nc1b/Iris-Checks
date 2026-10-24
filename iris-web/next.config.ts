import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The model evaluation reads its photo fixtures from disk.
  partialPrefetching: true,
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
