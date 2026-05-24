import { NextResponse } from "next/server";

import { buildFillTransaction } from "@/lib/onchain/clients/tensor-tcm";
import {
  assertTensorTradeWriteEnabled,
  requireTradeTxWalletChallenge,
  requireTrustedTensorTxOrigin,
  fetchTensorApiJson,
  getLatestBlockhashContext,
  getSolanaConnection,
  parseLamportsParam,
  parsePublicKeyParam,
  resolveBuyWritePath,
  restTransactionResponse,
  sdkTransactionResponse,
  TensorBffError,
  TENSOR_REST_NOT_CONFIGURED_MESSAGE,
} from "@/lib/onchain/tensor-tx-bff";
import { isTensorReadConfigured } from "@/lib/integrations/tensor";

export const runtime = "nodejs";

/**
 * GET /api/trade/tx/buy
 * Tensor fill tx — REST proxy when keyed (vendor pattern) or SDK fill when write enabled.
 *
 * Query: buyer, mint, owner, maxPrice; optional listState, writePath=rest|sdk,
 * challengeId, walletSignature (when TRADE_TX_REQUIRE_WALLET_CHALLENGE=true)
 *
 * Security: no CSRF on GET (security lane owns policy). Optional origin gate via
 * requireTrustedTensorTxOrigin; optional wallet challenge via requireTradeTxWalletChallenge
 * — see docs/integrations/onchain-trade-stack.md § Trade tx BFF.
 */
export async function GET(request: Request) {
  try {
    const originError = requireTrustedTensorTxOrigin(request);
    if (originError) return originError;
    assertTensorTradeWriteEnabled();

    const params = new URL(request.url).searchParams;
    const buyerParam = params.get("buyer");
    const mintParam = params.get("mint");
    const ownerParam = params.get("owner");
    const maxPriceParam = params.get("maxPrice");
    const listStateParam = params.get("listState");
    const writePath = resolveBuyWritePath(params.get("writePath"));

    if (!buyerParam || !mintParam || !maxPriceParam) {
      return NextResponse.json(
        { error: "buyer, mint, and maxPrice are required." },
        { status: 400 },
      );
    }

    const challengeError = requireTradeTxWalletChallenge(request, buyerParam);
    if (challengeError) return challengeError;

    if (writePath !== "sdk" && !ownerParam) {
      return NextResponse.json(
        { error: "owner is required for Tensor REST buy." },
        { status: 400 },
      );
    }

    if (writePath === "sdk" && !ownerParam && !listStateParam?.trim()) {
      return NextResponse.json(
        { error: "owner or listState is required for SDK buy." },
        { status: 400 },
      );
    }

    const connection = getSolanaConnection();
    const { blockhash, lastValidBlockHeight } =
      await getLatestBlockhashContext(connection);

    if (writePath === "sdk") {
      const buyer = parsePublicKeyParam("buyer", buyerParam);
      const mint = parsePublicKeyParam("mint", mintParam);
      const owner = ownerParam?.trim()
        ? parsePublicKeyParam("owner", ownerParam)
        : undefined;
      const maxAmountLamports = parseLamportsParam("maxPrice", maxPriceParam);
      const listState = listStateParam?.trim()
        ? parsePublicKeyParam("listState", listStateParam)
        : undefined;

      const tx = await buildFillTransaction({
        connection,
        buyer,
        mint,
        owner,
        maxAmountLamports,
        listState,
      });

      return NextResponse.json(
        sdkTransactionResponse(tx, blockhash, lastValidBlockHeight, buyer),
      );
    }

    if (!isTensorReadConfigured()) {
      return NextResponse.json(
        { error: TENSOR_REST_NOT_CONFIGURED_MESSAGE },
        { status: 503 },
      );
    }

    const data = await fetchTensorApiJson<unknown>("/api/v1/tx/buy", {
      buyer: buyerParam,
      mint: mintParam,
      owner: ownerParam!,
      maxPrice: maxPriceParam,
      blockhash,
    });

    return NextResponse.json(restTransactionResponse(data));
  } catch (error) {
    if (error instanceof TensorBffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Buy tx failed." },
      { status: 500 },
    );
  }
}
