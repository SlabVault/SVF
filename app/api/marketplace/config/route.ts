import { NextResponse } from "next/server";

import { getMarketplacePaymentConfig } from "@/lib/marketplace-config";

/**
 * GET /api/marketplace/config - Public payment config for checkout client
 */
export async function GET() {
  return NextResponse.json(getMarketplacePaymentConfig());
}
