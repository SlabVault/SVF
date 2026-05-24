import { NextResponse } from "next/server";

import {
  requireTensorTradeWriteEnabled,
  requireTradeTxWalletChallenge,
  requireTrustedTensorTxOrigin,
  fetchTensorApiJson,
  getLatestBlockhashContext,
  getSolanaConnection,
  TensorBffError,
} from "@/lib/onchain/tensor-tx-bff";
import { getSvfBrokerPubkey } from "@/lib/onchain/fees";

export const runtime = "nodejs";

/**
 * GET /api/trade/tx/bid
 * Tensor REST tx/bid proxy (vendor pattern).
 *
 * Query: owner, mint, price (lamports); optional expireIn (seconds), makerBroker, rentPayer
 */
export async function GET(request: Request) {
  try {
    const originError = requireTrustedTensorTxOrigin(request);
    if (originError) return originError;
    const writeError = requireTensorTradeWriteEnabled(request);
    if (writeError) return writeError;

    const params = new URL(request.url).searchParams;
    const owner = params.get("owner");
    const mint = params.get("mint");
    const price = params.get("price");
    const expireIn = params.get("expireIn");
    const makerBrokerParam = params.get("makerBroker");
    const rentPayer = params.get("rentPayer");

    if (!owner || !mint || !price) {
      return NextResponse.json(
        { error: "owner, mint, and price are required." },
        { status: 400 },
      );
    }

    const challengeError = requireTradeTxWalletChallenge(request, owner);
    if (challengeError) return challengeError;

    const connection = getSolanaConnection();
    const { blockhash } = await getLatestBlockhashContext(connection);

    const query: Record<string, string> = {
      owner,
      mint,
      price,
      blockhash,
    };
    if (expireIn) query.expireIn = expireIn;
    const makerBroker = makerBrokerParam?.trim() || getSvfBrokerPubkey();
    if (makerBroker) query.makerBroker = makerBroker;
    if (rentPayer) query.rentPayer = rentPayer;

    const data = await fetchTensorApiJson<unknown>("/api/v1/tx/bid", query);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TensorBffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bid tx failed." },
      { status: 500 },
    );
  }
}
