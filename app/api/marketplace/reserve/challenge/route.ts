import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api-errors";
import { validateWalletAddress } from "@/lib/security";
import { issueReserveChallenge } from "@/lib/wallet-challenge";

/**
 * GET /api/marketplace/reserve/challenge - Issue a signed reserve challenge
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const buyerWallet = searchParams.get("buyerWallet")?.trim() ?? "";

  if (!buyerWallet) {
    return jsonError({
      request,
      status: 400,
      code: "RESERVE_CHALLENGE_BUYER_WALLET_REQUIRED",
      message: "buyerWallet query parameter is required",
    });
  }

  if (!validateWalletAddress(buyerWallet)) {
    return jsonError({
      request,
      status: 400,
      code: "RESERVE_CHALLENGE_INVALID_BUYER_WALLET",
      message: "Invalid buyer wallet address",
    });
  }

  const challenge = issueReserveChallenge(buyerWallet);
  return NextResponse.json(challenge);
}
