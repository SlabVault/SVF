import type { MetadataRoute } from "next";

import { INTERNAL_NAV } from "@/lib/nav";

const EXTRA_PATHS = ["/vault/proof"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const origin = base.replace(/\/$/, "");
  const now = new Date();

  const navEntries = INTERNAL_NAV.map(({ href: path }) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));

  const extraEntries = EXTRA_PATHS.map((path) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...navEntries, ...extraEntries];
}
