import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'zjfsouoojhxvsvlcjusm.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'broadcast.trueattendly.online',
      },
      {
        protocol: 'https',
        hostname: 'trueattendly.online',
      },
    ],
  },
};

export default nextConfig;
