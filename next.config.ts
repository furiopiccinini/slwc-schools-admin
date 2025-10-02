import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features you're using
  },
  // Image optimization for Vercel
  images: {
    domains: ['your-s3-bucket.s3.amazonaws.com'], // Add your S3 domain
  },
  // Environment variables that should be available at build time
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
};

export default nextConfig;