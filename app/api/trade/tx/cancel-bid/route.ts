import { NextResponse } from "next/server";

import {
  assertTensorTradeWriteEnabled,
  requireTradeTxWalletChallenge,
  requireTrustedTensorTxOrigin,
  fetchTensorApiJson,
  getLatestBlockhashContext,
  getSolanaConnection,
  TensorBffError,
} from "@/lib/onchain/tensor-tx-bff";
import { isTradeTxWalletChallengeRequired } from "@/lib/wallet-challenge";

export const runtime = "nodejs";

/**
 * GET /api/trade/tx/cancel-bid
 * Tensor REST tx/cancelBid proxy (vendor pattern).
 *
 * Query: bidStateAddress; optional owner (required when TRADE_TX_REQUIRE_WALLET_CHALLENGE=true);
 * optional challengeId, walletSignature when wallet challenge enabled.
 */
export async function GET(request: Request) {
  try {
    const originError = requireTrustedTensorTxOrigin(request);
    if (originError) return originError;
    assertTensorTradeWriteEnabled();

    const params = new URL(request.url).searchParams;
    const bidStateAddress = params.get("bidStateAddress");
    const ownerParam = params.get("owner");

    if (!bidStateAddress?.trim()) {
      return NextResponse.json(
        { error: "bidStateAddress is required." },
        { status: 400 },
      );
    }

    if (isTradeTxWalletChallengeRequired()) {
      if (!ownerParam?.trim()) {
        return NextResponse.json(
          { error: "owner is required." },
          { status: 400 },
        );
      }
      const challengeError = requireTradeTxWalletChallenge(
        request,
        ownerParam.trim(),
      );
      if (challengeError) return challengeError;
    }

    const connection = getSolanaConnection();
    const { blockhash } = await getLatestBlockhashContext(connection);

    const data = await fetchTensorApiJson<unknown>("/api/v1/tx/cancelBid", {
      bidStateAddress: bidStateAddress.trim(),
      blockhash,
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TensorBffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cancel bid tx failed." },
      { status: 500 },
    );
  }
}
