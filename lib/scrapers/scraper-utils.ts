import axios from "axios";

export const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const SCRAPER_TIMEOUT_MS = 20000;

export async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": SCRAPER_USER_AGENT },
      timeout: SCRAPER_TIMEOUT_MS,
      maxRedirects: 5,
    });
    return String(response.data);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return null;
  }
}

/** Normalize scraped image URLs for SlabCard / SlabImage. */
export function normalizeImageUrl(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";

  let url = raw.trim().replace(/&amp;/g, "&");

  if (url.startsWith("//")) {
    url = `https:${url}`;
  } else if (url.startsWith("/")) {
    return "";
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

export function decodeFlightString(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/g, "&");
}

export function parseFlightStringField(
  block: string,
  field: string,
): string | null {
  const pattern = new RegExp(
    `&quot;${field}&quot;:\\[0,&quot;((?:[^&]|&amp;)*)`,
  );
  const match = block.match(pattern);
  return match ? decodeFlightString(match[1]) : null;
}

export function parseFlightNumberField(
  block: string,
  field: string,
): number | null {
  const pattern = new RegExp(`&quot;${field}&quot;:\\[0,([0-9.]+|null)\\]`);
  const match = block.match(pattern);
  if (!match || match[1] === "null") return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function shortSlabName(fullName: string): string {
  const yearMatch = fullName.match(/\b(20\d{2})\b/);
  const year = yearMatch?.[1] ?? "";
  const cardMatch = fullName.match(/#\s*(\d+)/);
  const cardNum = cardMatch ? `#${cardMatch[1]}` : "";
  const pokemonMatch = fullName.match(
    /#\d+\s+([A-Za-z][A-Za-z0-9'.\- ]*?)(?:\s+(?:CGC|PSA|BGS|SGC|Gem|MINT|Pristine|Pokemon|Reverse|Special|Art|Rare|Holo|Japanese|EN|sv))/i,
  );
  const pokemon = pokemonMatch?.[1]?.trim();

  if (pokemon && cardNum && year) {
    return `${pokemon} ${cardNum} ${year}`;
  }
  if (pokemon && cardNum) {
    return `${pokemon} ${cardNum}`;
  }

  return fullName.length > 60 ? `${fullName.slice(0, 57)}...` : fullName;
}
