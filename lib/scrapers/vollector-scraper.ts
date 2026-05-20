import {
  fetchHtml,
  normalizeImageUrl,
  parseFlightNumberField,
  parseFlightStringField,
  shortSlabName,
} from "./scraper-utils";

export type VollectorSlab = {
  id: string;
  name: string;
  grade: string;
  estimatedValueUsd: number | null;
  acquiredAt: string;
  imageUrl: string;
  profileUrl: string;
  itemUrl: string;
  collectrUrl: string | null;
};

const ASSET_ID_PATTERN =
  /&quot;id&quot;:\[0,&quot;([a-f0-9-]{36})&quot;\]/g;

function extractAssetBlocks(html: string): string[] {
  const blocks: string[] = [];
  const matches = [...html.matchAll(ASSET_ID_PATTERN)];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end =
      i + 1 < matches.length
        ? (matches[i + 1].index ?? html.length)
        : start + 2500;
    blocks.push(html.slice(start, Math.min(end, start + 2500)));
  }

  return blocks;
}

function parseAssetBlock(
  block: string,
  profileUrl: string,
): VollectorSlab | null {
  const id = parseFlightStringField(block, "id");
  const fullName = parseFlightStringField(block, "name");
  const imageUrl = normalizeImageUrl(parseFlightStringField(block, "image_url"));

  if (!id || !fullName || !imageUrl) {
    return null;
  }

  const grade = parseFlightStringField(block, "grade") ?? "";
  const estimatedValueUsd = parseFlightNumberField(block, "last_sale_price");
  const acquiredAt =
    parseFlightStringField(block, "created_at")?.split("T")[0] ??
    parseFlightStringField(block, "minted_at")?.split("T")[0] ??
    new Date().toISOString().split("T")[0];

  const host = profileUrl.includes("vaulted.id") ? "vaulted.id" : "vollector.id";

  return {
    id,
    name: shortSlabName(fullName),
    grade,
    estimatedValueUsd,
    acquiredAt,
    imageUrl,
    profileUrl,
    itemUrl: `https://${host}/c/${id}`,
    collectrUrl: null,
  };
}

/**
 * Scrape slab inventory from Vollector / Vaulted profile pages (Astro RSC payload).
 */
export async function scrapeVollectorProfile(
  profileUrl: string,
  preloadedHtml?: string,
): Promise<VollectorSlab[] | null> {
  const html = preloadedHtml ?? (await fetchHtml(profileUrl));
  if (!html) return null;

  const slabs = extractAssetBlocks(html)
    .map((block) => parseAssetBlock(block, profileUrl))
    .filter((slab): slab is VollectorSlab => slab !== null);

  const unique = new Map<string, VollectorSlab>();
  for (const slab of slabs) {
    unique.set(slab.id, slab);
  }

  const result = [...unique.values()];
  return result.length > 0 ? result : null;
}

export async function fetchVollectorData(
  profileUrl: string,
): Promise<VollectorSlab[] | null> {
  return scrapeVollectorProfile(profileUrl);
}
