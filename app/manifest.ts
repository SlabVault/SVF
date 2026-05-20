import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SlabVaultFi",
    short_name: "SVF",
    description: "Community-owned collectible vault on Solana",
    start_url: "/",
    display: "standalone",
    background_color: "#07040c",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/icon.png",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "36x36",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
