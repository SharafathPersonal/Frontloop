import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@whiskeysockets/baileys"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
