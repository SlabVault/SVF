import { isTensorReadConfigured } from "@/lib/integrations/tensor";
import {
  enrichTradeLandingCollectionsWithTensor,
  getTradeLandingAggregateFromCollections,
  getTradeLandingCollections,
  loadOptionalTradeLandingTreasuryContext,
  loadTradeLandingPartnerPreviews,
} from "@/lib/trade-landing";
import { fetchSolUsdPrice } from "@/lib/sol-price";

import { TradeFooterTicker } from "./trade-footer-ticker";

type Props = {
  className?: string;
};

/** Partner + treasury previews — matches landing pulse aggregate, not static nav stubs. */
async function resolveFooterAggregate() {
  const [treasuryContext, partnerContext] = await Promise.all([
    loadOptionalTradeLandingTreasuryContext(),
    loadTradeLandingPartnerPreviews(),
  ]);

  const collections = getTradeLandingCollections(treasuryContext.treasuryStats, {
    treasuryUnavailable: treasuryContext.treasuryUnavailable,
    partnerPreviews: partnerContext.previews,
  });

  return getTradeLandingAggregateFromCollections(collections);
}

async function resolveFooterVolume24hSol(
  aggregateVolume24hSol: number | null,
): Promise<number | null> {
  if (aggregateVolume24hSol != null) return aggregateVolume24hSol;
  if (!isTensorReadConfigured()) return null;

  const collections = await enrichTradeLandingCollectionsWithTensor(
    getTradeLandingCollections(),
  );
  return getTradeLandingAggregateFromCollections(collections).volume24hSol;
}

/** Server wrapper — fetches public SOL/USD and live partner aggregate for the footer ticker. */
export async function TradeFooterTickerServer({ className }: Props = {}) {
  const aggregate = await resolveFooterAggregate();
  const [solPriceUsd, volume24hSol] = await Promise.all([
    fetchSolUsdPrice(),
    resolveFooterVolume24hSol(aggregate.volume24hSol),
  ]);

  return (
    <TradeFooterTicker
      className={className}
      listedCount={aggregate.listedCount}
      floorSol={aggregate.floorSol}
      volume24hSol={volume24hSol}
      solPriceUsd={solPriceUsd}
    />
  );
}
