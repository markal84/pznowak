import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Portable static frontend; dynamic data is supplied by the CMS/API.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
