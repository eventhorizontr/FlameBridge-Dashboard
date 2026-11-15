import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Server code reads the published JSON from public/data with fs; make sure serverless bundles
  // carry it (contours and keyframe sprites are only fetched by the browser).
  // /experiments/[id] renders run pages on request (partial prerendering), so it reads them too.
  outputFileTracingIncludes: {
    "/api/**": ["./public/data/**/*.json"],
    "/experiments/**": ["./public/data/**/*.json"],
  },
  outputFileTracingExcludes: {
    "/api/**": ["./public/data/**/vision/*.contours.json"],
    "/experiments/**": ["./public/data/**/vision/*.contours.json"],
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
