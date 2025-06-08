import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'serwer1542079.home.pl',
        pathname: '/autoinstalator/wordpress/wp-content/uploads/**', // Allow any image in uploads directory
      },
    ],
  },
};

export default nextConfig;
