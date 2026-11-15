import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Server code reads the published JSON from public/data with fs; make sure serverless bundles
  // carry it (contours and keyframe sprites are only fetched by the browser).
  outputFileTracingIncludes: {
    "/api/**": ["./public/data/**/*.json"],
  },
  outputFileTracingExcludes: {
    "/api/**": ["./public/data/**/vision/*.contours.json"],
  },
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
