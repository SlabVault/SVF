import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api-errors";
import { requireTrustedTensorTxOrigin } from "@/lib/onchain/tensor-tx-bff";
import { validateWalletAddress } from "@/lib/security";
import { issueTradeTxChallenge } from "@/lib/wallet-challenge";

export const runtime = "nodejs";

/**
 * GET /api/trade/tx/challenge - Issue a signed wallet challenge for trade tx BFF
 */
export async function GET(request: Request) {
  const originError = requireTrustedTensorTxOrigin(request);
  if (originError) return originError;

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim() ?? "";

  if (!wallet) {
    return jsonError({
      request,
      status: 400,
      code: "TRADE_TX_CHALLENGE_WALLET_REQUIRED",
      message: "wallet query parameter is required",
    });
  }

  if (!validateWalletAddress(wallet)) {
    return jsonError({
      request,
      status: 400,
      code: "TRADE_TX_CHALLENGE_INVALID_WALLET",
      message: "Invalid wallet address",
    });
  }

  const challenge = issueTradeTxChallenge(wallet);
  return NextResponse.json(challenge);
}
