import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "http://51.20.181.136/:path*",
      },
    ];
  },
};

export default nextConfig;
