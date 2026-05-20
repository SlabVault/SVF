import axios from "axios";
import * as cheerio from "cheerio";

export type VaultedSlab = {
  id: string;
  name: string;
  grade: string;
  estimatedValueUsd: number | null;
  acquiredAt: string;
  imageUrl: string;
  vaultedUrl: string;
  collectrUrl: string | null;
};

/**
 * Scrape slab data from Vaulted.id profile
 */
export async function scrapeVaultedProfile(
  profileUrl: string
): Promise<VaultedSlab[] | null> {
  try {
    const response = await axios.get(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const slabs: VaultedSlab[] = [];

    // Note: The actual HTML structure will need to be inspected and adjusted
    // This is a template based on typical collectibles site patterns
    
    // Look for slab cards or items in the profile
    $(".slab-card, .collection-item, .card-item").each((index, element) => {
      const $el = $(element);
      
      const name = $el.find(".name, .title, h3, h4").first().text().trim();
      const grade = $el.find(".grade, .condition, .label").first().text().trim();
      const imageUrl = $el.find("img").first().attr("src") || "";
      const vaultedUrl = $el.find("a").first().attr("href") || profileUrl;
      
      // Try to extract estimated value
      const valueText = $el.find(".value, .price, .estimated").first().text().trim();
      const estimatedValueUsd = valueText
        ? parseFloat(valueText.replace(/[^0-9.]/g, ""))
        : null;

      // Try to extract acquisition date
      const dateText = $el.find(".date, .acquired, .added").first().text().trim();
      const acquiredAt = dateText || new Date().toISOString().split("T")[0];

      // Try to find Collectr link
      const collectrUrl = $el
        .find('a[href*="collectr"], a[href*="getcollectr"]')
        .first()
        .attr("href") || null;

      if (name) {
        slabs.push({
          id: `vaulted-${index}`,
          name,
          grade,
          estimatedValueUsd,
          acquiredAt,
          imageUrl,
          vaultedUrl,
          collectrUrl,
        });
      }
    });

    return slabs;
  } catch (error: unknown) {
    console.error("Error scraping Vaulted.id profile:", error);
    return null;
  }
}

/**
 * Alternative: Try to fetch data from Vaulted.id API if available
 * This would be the preferred method if they have an API
 */
export async function fetchVaultedData(
  profileUrl: string
): Promise<VaultedSlab[] | null> {
  try {
    // Extract username from URL
    const match = profileUrl.match(/vaulted\.id\/u\/([^\/]+)/);
    if (!match) {
      throw new Error("Invalid Vaulted.id profile URL");
    }

    const username = match[1];
    
    // Try API endpoint (this is hypothetical - would need actual API docs)
    const apiUrl = `https://api.vaulted.id/users/${username}/collection`;
    
    const response = await axios.get(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    // Map API response to our format
    // This would need to be adjusted based on actual API structure
    return response.data.map((item: { id?: string; name?: string; title?: string; grade?: string; condition?: string; value?: number; estimated_value?: number; acquired_at?: string; date_added?: string; image_url?: string; image?: string; url?: string; collectr_url?: string | null }, index: number) => ({
      id: item.id || `vaulted-${index}`,
      name: item.name || item.title,
      grade: item.grade || item.condition,
      estimatedValueUsd: item.value || item.estimated_value,
      acquiredAt: item.acquired_at || item.date_added,
      imageUrl: item.image_url || item.image,
      vaultedUrl: item.url || `${profileUrl}/${item.id}`,
      collectrUrl: item.collectr_url || null,
    }));
  } catch (error) {
    console.error("Error fetching Vaulted.id API data:", error);
    // Fallback to scraping
    return scrapeVaultedProfile(profileUrl);
  }
}
