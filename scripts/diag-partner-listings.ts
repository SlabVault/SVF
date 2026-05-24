import { getTradeCollectionBySlug } from "@/lib/onchain/collections";
import { listPartnerTradeListings } from "@/lib/partner-listings";

async function main() {
  const cc = getTradeCollectionBySlug("collector-crypt");
  const phy = getTradeCollectionBySlug("phygitals");
  if (!cc || !phy) {
    console.error("Missing collection config");
    process.exit(1);
  }

  const t0 = Date.now();
  const ccResult = await listPartnerTradeListings(cc);
  const ccMs = Date.now() - t0;

  const t1 = Date.now();
  const phyResult = await listPartnerTradeListings(phy);
  const phyMs = Date.now() - t1;

  console.log(
    JSON.stringify(
      {
        collectorCrypt: {
          count: ccResult.listings.length,
          ms: ccMs,
          dbStatus: ccResult.dbStatus,
          fromFallback: ccResult.fromFallback,
          sources: ccResult.sources,
        },
        phygitals: {
          count: phyResult.listings.length,
          ms: phyMs,
          dbStatus: phyResult.dbStatus,
          fromFallback: phyResult.fromFallback,
          sources: phyResult.sources,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
