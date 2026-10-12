import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["xlsx", "cfb"],
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
  outputFileTracingIncludes: {
    "/api/admin/export-subscribers": ["./templates/**/*"],
  },
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features you're using
  },
  images: {
    domains: ['your-s3-bucket.s3.amazonaws.com'],
  },
};

export default nextConfig;