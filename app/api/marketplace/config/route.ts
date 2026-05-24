import { NextResponse } from "next/server";

import { getMarketplacePaymentConfig } from "@/lib/marketplace-config";
import { PAYMENT_SPLITS } from "@/lib/marketplace-split";

/**
 * GET /api/marketplace/config - Public payment config for checkout client
 */
export async function GET() {
  return NextResponse.json({
    ...getMarketplacePaymentConfig(),
    supportedSplits: PAYMENT_SPLITS,
  });
}
