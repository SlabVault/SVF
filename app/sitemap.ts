import type { MetadataRoute } from "next";

import { INTERNAL_NAV } from "@/lib/nav";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const now = new Date();

  return INTERNAL_NAV.map(({ href: path }) => ({
    url: `${base.replace(/\/$/, "")}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
