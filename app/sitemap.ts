import type { MetadataRoute } from "next";

import { getPublicNav } from "@/lib/nav";
import { getSiteOrigin } from "@/lib/seo";

const EXTRA_PATHS = ["/vault/proof"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const now = new Date();
  const crawlHints: Partial<
    Record<string, { changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }>
  > = {
    "/": { changeFrequency: "daily", priority: 1 },
    "/trade": { changeFrequency: "daily", priority: 0.9 },
    "/trade/portfolio": { changeFrequency: "weekly", priority: 0.75 },
    "/svf": { changeFrequency: "daily", priority: 0.85 },
    "/vault": { changeFrequency: "weekly", priority: 0.85 },
    "/pulls": { changeFrequency: "weekly", priority: 0.8 },
    "/streams": { changeFrequency: "daily", priority: 0.8 },
    "/community": { changeFrequency: "weekly", priority: 0.75 },
    "/faq": { changeFrequency: "monthly", priority: 0.65 },
    "/roadmap": { changeFrequency: "monthly", priority: 0.65 },
    "/vault/proof": { changeFrequency: "weekly", priority: 0.7 },
  };

  const navEntries = getPublicNav().map(({ href: path }) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: crawlHints[path]?.changeFrequency ?? "weekly",
    priority: crawlHints[path]?.priority ?? 0.7,
  }));

  const extraEntries = EXTRA_PATHS.map((path) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: crawlHints[path]?.changeFrequency ?? "weekly",
    priority: crawlHints[path]?.priority ?? 0.6,
  }));

  return [...navEntries, ...extraEntries];
}
