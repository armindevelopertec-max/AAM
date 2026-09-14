import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["segtecam.space", "www.segtecam.space", "*.segtecam.space"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
