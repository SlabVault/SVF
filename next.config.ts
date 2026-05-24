import path from "node:path";
import type { NextConfig } from "next";

const walletStub = path.resolve(__dirname, "lib/wallet-adapters-stub.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Allow LAN / custom host access to dev HMR and /_next/* (see Next 16 allowedDevOrigins)
  allowedDevOrigins: ["192.168.178.120", "192.168.*.*"],
  experimental: {
    optimizePackageImports: [
      "@solana/web3.js",
      "@solana/wallet-adapter-base",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui",
      "@coral-xyz/anchor",
    ],
  },
  async redirects() {
    return [
      { source: "/icon", destination: "/icon.png", permanent: false },
      { source: "/apple-icon", destination: "/apple-icon.png", permanent: false },
      // Discover aggregator archived — /trade is the sole public buy surface
      { source: "/discover", destination: "/trade?from=discover", permanent: true },
      { source: "/discover/:path*", destination: "/trade?from=discover", permanent: true },
      // Vault shop archived — /trade is the single public buy surface
      { source: "/marketplace/orders", destination: "/trade/portfolio?from=vault-purchases", permanent: true },
      { source: "/marketplace/order/:id", destination: "/trade/portfolio?from=vault-purchases", permanent: true },
      { source: "/marketplace/checkout/:id", destination: "/trade?from=marketplace", permanent: true },
      { source: "/marketplace/:id", destination: "/trade?from=marketplace", permanent: true },
      { source: "/marketplace", destination: "/trade?from=marketplace", permanent: true },
      { source: "/vault/shop", destination: "/trade?from=vault-shop", permanent: true },
      { source: "/vault/shop/:path*", destination: "/trade?from=vault-shop", permanent: true },
      { source: "/vault/purchases", destination: "/trade/portfolio?from=vault-purchases", permanent: true },
      { source: "/vault/purchases/:path*", destination: "/trade/portfolio?from=vault-purchases", permanent: true },
    ];
  },
  turbopack: {
    resolveAlias: {
      "@solana/wallet-adapter-wallets": walletStub,
      "@solana/wallet-adapter-walletconnect": walletStub,
    },
  },
  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@solana/wallet-adapter-wallets": walletStub,
      "@solana/wallet-adapter-walletconnect": walletStub,
    };

    // Windows dev: gzip pack files (.pack.gz) corrupt easily when dev/build race.
    if (dev && process.platform === "win32" && config.cache && typeof config.cache === "object") {
      config.cache = { ...config.cache, compression: false };
    }

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
