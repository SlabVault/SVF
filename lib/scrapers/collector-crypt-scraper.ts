import axios from "axios";
import * as cheerio from "cheerio";

import {
  fetchHtml,
  parseFlightStringField,
  SCRAPER_MAX_RESPONSE_BYTES,
  SCRAPER_TIMEOUT_MS,
  SCRAPER_USER_AGENT,
} from "./scraper-utils";
import { scrapeVollectorProfile, type VollectorSlab } from "./vollector-scraper";

export type CollectorCryptPull = {
  id: string;
  date: string;
  source: string;
  summary: string;
  costUsd: number | null;
  outcomeUsd: number | null;
  clipUrl: string;
};

/** Immutable replay token from Collector Crypt gacha clip URLs (query or /r/ path). */
export function extractReplayIdFromClipUrl(clipUrl: string): string | null {
  const trimmed = clipUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("replay");
    if (fromQuery) return fromQuery;

    const shortPath = url.pathname.match(/^\/r\/([^/]+)\/?$/i);
    if (shortPath?.[1]) return shortPath[1];

    return null;
  } catch {
    const queryMatch = trimmed.match(/[?&]replay=([^&#]+)/i);
    if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]);

    const pathMatch = trimmed.match(/\/r\/([^/?#]+)/i);
    if (pathMatch?.[1]) return pathMatch[1];

    return null;
  }
}

/** Stable pull id for sync dedupe and admin audit when a replay token exists. */
export function collectorCryptPullStableId(
  pull: Pick<CollectorCryptPull, "id" | "clipUrl">,
): string {
  const replayId = extractReplayIdFromClipUrl(pull.clipUrl);
  if (replayId) return `cc-replay-${replayId}`;
  return pull.id;
}

/**
 * Collector Crypt account pages are client-rendered SPAs. Attempt Vollector-style
 * payload parsing when present; otherwise return null so fallbacks can run.
 */
export async function scrapeCollectorCryptSlabs(
  accountUrl: string,
): Promise<VollectorSlab[] | null> {
  const html = await fetchHtml(accountUrl);
  if (!html) return null;

  const embedded = await scrapeVollectorProfile(accountUrl, html);
  if (embedded?.length) {
    return embedded.map((slab) => ({
      ...slab,
      profileUrl: accountUrl,
    }));
  }

  return null;
}

/**
 * Scrape pull history from Collector Crypt account (SPA — usually empty).
 */
export async function scrapeCollectorCryptPulls(
  accountUrl: string,
): Promise<CollectorCryptPull[] | null> {
  const html = await fetchHtml(accountUrl);
  if (!html) return null;

  const $ = cheerio.load(html);
  const pulls: CollectorCryptPull[] = [];

  $(".pull-item, .transaction-item, .history-item").each((index, element) => {
    const $el = $(element);

    const date = $el.find(".date, .timestamp, .time").first().text().trim();
    const source = $el.find(".source, .partner, .platform").first().text().trim();
    const summary = $el.find(".summary, .description, .details").first().text().trim();
    const clipUrl =
      $el.find('a[href*="clip"], a[href*="video"], a[href*="watch"], a[href*="replay"]')
        .first()
        .attr("href") || "";

    const costText = $el.find(".cost, .spent, .price").first().text().trim();
    const costUsd = costText ? parseFloat(costText.replace(/[^0-9.]/g, "")) : null;

    const outcomeText = $el.find(".outcome, .value, .won").first().text().trim();
    const outcomeUsd = outcomeText
      ? parseFloat(outcomeText.replace(/[^0-9.]/g, ""))
      : null;

    if (date || summary) {
      const draft = {
        id: `pull-${index}`,
        date: date || new Date().toISOString().split("T")[0],
        source: source || "Collector Crypt",
        summary: summary || "Pull from gacha",
        costUsd,
        outcomeUsd,
        clipUrl,
      };
      pulls.push({
        ...draft,
        id: collectorCryptPullStableId(draft),
      });
    }
  });

  const replayPattern =
    /https:\/\/gacha\.collectorcrypt\.com\/\?replay=[a-zA-Z0-9-]+/g;
  const replays = [...html.matchAll(replayPattern)];
  replays.forEach((match, index) => {
    const draft = {
      id: `replay-${index}`,
      date: new Date().toISOString().split("T")[0],
      source: "Collector Crypt",
      summary: parseFlightStringField(html, "name") ?? "Gacha replay",
      costUsd: null,
      outcomeUsd: null,
      clipUrl: match[0],
    };
    pulls.push({
      ...draft,
      id: collectorCryptPullStableId(draft),
    });
  });

  return pulls.length > 0 ? pulls : null;
}

/**
 * Try Collector Crypt API endpoints, then fall back to HTML scraping.
 */
export async function fetchCollectorCryptData(
  accountUrl: string,
): Promise<CollectorCryptPull[] | null> {
  const match = accountUrl.match(/account\/([a-zA-Z0-9]+)/);
  if (!match) return scrapeCollectorCryptPulls(accountUrl);

  const accountId = match[1];
  const apiCandidates = [
    `https://api.collectorcrypt.com/accounts/${accountId}/pulls`,
    `https://api.collectorcrypt.com/v1/accounts/${accountId}/pulls`,
  ];

  for (const apiUrl of apiCandidates) {
    try {
      const response = await axios.get(apiUrl, {
        headers: { "User-Agent": SCRAPER_USER_AGENT },
        timeout: SCRAPER_TIMEOUT_MS,
        maxContentLength: SCRAPER_MAX_RESPONSE_BYTES,
        maxBodyLength: SCRAPER_MAX_RESPONSE_BYTES,
      });

      const data = response.data as Array<{
        id?: string;
        date?: string;
        timestamp?: string;
        source?: string;
        partner?: string;
        summary?: string;
        description?: string;
        cost?: number;
        spent?: number;
        outcome?: number;
        value?: number;
        clip_url?: string;
        video_url?: string;
      }>;

      if (Array.isArray(data) && data.length > 0) {
        return data.map((item, index) => {
          const draft = {
            id: item.id || `pull-${index}`,
            date: item.date || item.timestamp || new Date().toISOString().split("T")[0],
            source: item.source || item.partner || "Collector Crypt",
            summary: item.summary || item.description || "Pull from gacha",
            costUsd: item.cost ?? item.spent ?? null,
            outcomeUsd: item.outcome ?? item.value ?? null,
            clipUrl: item.clip_url || item.video_url || "",
          };
          return {
            ...draft,
            id: collectorCryptPullStableId(draft),
          };
        });
      }
    } catch {
      // try next candidate
    }
  }

  return scrapeCollectorCryptPulls(accountUrl);
}

export async function fetchCollectorCryptSlabs(
  accountUrls: string[],
): Promise<VollectorSlab[] | null> {
  const merged = new Map<string, VollectorSlab>();

  for (const url of accountUrls) {
    const slabs = await scrapeCollectorCryptSlabs(url);
    if (!slabs) continue;
    for (const slab of slabs) {
      merged.set(`${slab.imageUrl}-${slab.id}`, slab);
    }
  }

  const result = [...merged.values()];
  return result.length > 0 ? result : null;
}

/**
 * Get wallet address from Collector Crypt account page.
 */
export async function getCollectorCryptWallet(
  accountUrl: string,
): Promise<string | null> {
  const html = await fetchHtml(accountUrl);
  if (!html) return null;

  const walletMatch = html.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  return walletMatch?.[0] ?? null;
}
