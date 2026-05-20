import path from "node:path";
import type { NextConfig } from "next";

const walletStub = path.resolve(__dirname, "lib/wallet-adapters-stub.ts");

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@solana/wallet-adapter-wallets": walletStub,
      "@solana/wallet-adapter-walletconnect": walletStub,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@solana/wallet-adapter-wallets": walletStub,
      "@solana/wallet-adapter-walletconnect": walletStub,
    };
    return config;
  },
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
      {
        protocol: "https",
        hostname: "i.imgur.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.helius-rpc.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
