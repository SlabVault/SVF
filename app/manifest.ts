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
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
