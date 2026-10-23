import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT === '1' ? { output: 'export' as const } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'serwer1542079.home.pl',
        port: '',
        // Allow uploads from both /wordpress/ and /pznowak/ installs
        pathname: '/autoinstalator/**/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;
