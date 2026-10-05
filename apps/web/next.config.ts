import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@innoverse/database", "@innoverse/types"],
  serverExternalPackages: ["mongoose", "ioredis"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "ghchart.rshah.org" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "*.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
