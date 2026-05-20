import axios from "axios";
import * as cheerio from "cheerio";

export type CollectorCryptPull = {
  id: string;
  date: string;
  source: string;
  summary: string;
  costUsd: number | null;
  outcomeUsd: number | null;
  clipUrl: string;
};

/**
 * Scrape pull history from Collector Crypt account
 */
export async function scrapeCollectorCryptPulls(
  accountUrl: string
): Promise<CollectorCryptPull[] | null> {
  try {
    const response = await axios.get(accountUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const pulls: CollectorCryptPull[] = [];

    // Note: The actual HTML structure will need to be inspected and adjusted
    // This is a template based on typical gacha site patterns
    
    // Look for pull history or transaction items
    $(".pull-item, .transaction-item, .history-item").each((index, element) => {
      const $el = $(element);
      
      const date = $el.find(".date, .timestamp, .time").first().text().trim();
      const source = $el.find(".source, .partner, .platform").first().text().trim();
      const summary = $el.find(".summary, .description, .details").first().text().trim();
      const clipUrl = $el.find('a[href*="clip"], a[href*="video"], a[href*="watch"]').first().attr("href") || "";
      
      // Try to extract cost
      const costText = $el.find(".cost, .spent, .price").first().text().trim();
      const costUsd = costText ? parseFloat(costText.replace(/[^0-9.]/g, "")) : null;
      
      // Try to extract outcome/value
      const outcomeText = $el.find(".outcome, .value, .won").first().text().trim();
      const outcomeUsd = outcomeText ? parseFloat(outcomeText.replace(/[^0-9.]/g, "")) : null;

      if (date || summary) {
        pulls.push({
          id: `pull-${index}`,
          date: date || new Date().toISOString().split("T")[0],
          source: source || "Collector Crypt",
          summary: summary || "Pull from gacha",
          costUsd,
          outcomeUsd,
          clipUrl,
        });
      }
    });

    return pulls;
  } catch (error: unknown) {
    console.error("Error scraping Collector Crypt pulls:", error);
    return null;
  }
}

/**
 * Alternative: Try to fetch data from Collector Crypt API if available
 */
export async function fetchCollectorCryptData(
  accountUrl: string
): Promise<CollectorCryptPull[] | null> {
  try {
    // Extract account ID from URL
    const match = accountUrl.match(/account\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error("Invalid Collector Crypt account URL");
    }

    const accountId = match[1];
    
    // Try API endpoint (this is hypothetical - would need actual API docs)
    const apiUrl = `https://api.collectorcrypt.com/accounts/${accountId}/pulls`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    // Map API response to our format
    return response.data.map((item: { id?: string; date?: string; timestamp?: string; source?: string; partner?: string; summary?: string; description?: string; cost?: number; spent?: number; cost_usd?: number | null; outcome?: number; value?: number; outcome_usd?: number | null; clip_url?: string; video_url?: string }, index: number) => ({
      id: item.id || `pull-${index}`,
      date: item.date || item.timestamp,
      source: item.source || item.partner || "Collector Crypt",
      summary: item.summary || item.description,
      costUsd: item.cost || item.spent,
      outcomeUsd: item.outcome || item.value,
      clipUrl: item.clip_url || item.video_url || "",
    }));
  } catch (error) {
    console.error("Error fetching Collector Crypt API data:", error);
    // Fallback to scraping
    return scrapeCollectorCryptPulls(accountUrl);
  }
}

/**
 * Get wallet address from Collector Crypt account
 */
export async function getCollectorCryptWallet(
  accountUrl: string
): Promise<string | null> {
  try {
    const response = await axios.get(accountUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // Look for wallet address in the page
    const walletText = $(".wallet-address, .address, [data-wallet]").first().text().trim();
    
    // Try to extract Solana address pattern (base58, 32-44 chars)
    const walletMatch = walletText.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    
    return walletMatch ? walletMatch[0] : null;
  } catch (error) {
    console.error("Error getting Collector Crypt wallet:", error);
    return null;
  }
}
