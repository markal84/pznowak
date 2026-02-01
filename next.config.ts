import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Wykomentowane dla ISR na Vercel; odkomentuj dla static build na home.pl
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
