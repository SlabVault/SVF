import { fetchHtml, normalizeImageUrl } from "./scraper-utils";
import type { VollectorSlab } from "./vollector-scraper";

/**
 * Collectr showcase pages are client-rendered SPAs without embedded card JSON.
 * This scraper is a last-resort placeholder and typically returns null.
 */
export async function scrapeCollectrShowcase(
  showcaseUrl: string,
): Promise<VollectorSlab[] | null> {
  const html = await fetchHtml(showcaseUrl);
  if (!html) return null;

  const slabs: VollectorSlab[] = [];
  const imagePattern =
    /https?:\/\/[^"'\\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\s>]*)?/gi;
  const images = [
    ...new Set(
      [...html.matchAll(imagePattern)]
        .map((match) => normalizeImageUrl(match[0]))
        .filter(Boolean),
    ),
  ];

  images.slice(0, 12).forEach((imageUrl, index) => {
    slabs.push({
      id: `collectr-${index}`,
      name: `Collectr item ${index + 1}`,
      grade: "",
      estimatedValueUsd: null,
      acquiredAt: new Date().toISOString().split("T")[0],
      imageUrl,
      profileUrl: showcaseUrl,
      itemUrl: showcaseUrl,
      collectrUrl: showcaseUrl,
    });
  });

  return slabs.length > 0 ? slabs : null;
}
