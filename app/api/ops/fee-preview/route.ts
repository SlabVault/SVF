import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAuth } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-errors";
import { previewFeeSplit } from "@/lib/onchain/fees";

export const dynamic = "force-dynamic";

/** GET /api/ops/fee-preview — read-only broker fee split preview (not an on-chain quote). */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    return NextResponse.json(previewFeeSplit());
  } catch (error) {
    console.error("Error loading fee split preview:", error);
    return jsonError({
      request,
      status: 500,
      code: "OPS_FEE_PREVIEW_INTERNAL_ERROR",
      message: "Failed to load fee split preview.",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
