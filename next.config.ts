import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d1xpxki1g4htqu.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "arweave.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "collectorcrypt.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vollector.id",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vaulted.id",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.getcollectr.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
