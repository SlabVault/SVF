import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/vault", "/trade", "/pulls", "/streams", "/community"],
        disallow: [
          "/admin",
          "/api",
          "/discover",
          "/vault/shop",
          "/vault/shop/checkout",
          "/marketplace",
        ],
      },
    ],
    host: origin,
    sitemap: `${origin}/sitemap.xml`,
  };
}
