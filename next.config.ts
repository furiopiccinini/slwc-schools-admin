import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features you're using
  },
  images: {
    domains: ['your-s3-bucket.s3.amazonaws.com'],
  },
};

export default nextConfig;