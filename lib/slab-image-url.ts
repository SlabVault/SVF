import type { SiteConfig, SlabItem } from "@/types/content";

const HERO_IMAGE_LIMIT = 3;

/** Normalize slab image URLs from JSON / admin / scrapers. */
export function normalizeSlabImageSrc(
  src: string | null | undefined,
): string | null {
  if (!src?.trim()) return null;

  const trimmed = src.trim();

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** URLs for the hero card stack — up to 3 slabs with images, then site.latestSlab fallback. */
export function getHeroSlabImageUrls(
  site: SiteConfig,
  slabs: SlabItem[],
): string[] {
  const fromSlabs: string[] = [];
  for (const slab of slabs) {
    const url = normalizeSlabImageSrc(slab.imageUrl);
    if (!url) continue;
    fromSlabs.push(url);
    if (fromSlabs.length >= HERO_IMAGE_LIMIT) break;
  }

  if (fromSlabs.length >= 2) {
    return fromSlabs;
  }

  const latest = normalizeSlabImageSrc(site.latestSlab.imageUrl);
  const merged = latest ? [latest, ...fromSlabs] : fromSlabs;

  return merged.slice(0, HERO_IMAGE_LIMIT);
}
