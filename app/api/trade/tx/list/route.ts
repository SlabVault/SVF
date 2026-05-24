import { NextResponse } from "next/server";

import { buildListTransaction } from "@/lib/onchain/clients/tensor-tcm";
import {
  assertTensorTradeWriteEnabled,
  requireTrustedTensorTxOrigin,
  fetchTensorApiJson,
  getLatestBlockhashContext,
  getSolanaConnection,
  parseLamportsParam,
  parsePublicKeyParam,
  requireTradeTxWalletChallenge,
  resolveListWritePath,
  restTransactionResponse,
  sdkTransactionResponse,
  TensorBffError,
  TENSOR_REST_NOT_CONFIGURED_MESSAGE,
} from "@/lib/onchain/tensor-tx-bff";
import { isTensorReadConfigured } from "@/lib/integrations/tensor";

export const runtime = "nodejs";

/**
 * GET /api/trade/tx/list
 * Tensor list tx — REST proxy when keyed (vendor pattern) or SDK list when write enabled.
 *
 * Query: owner, mint, price; optional feePayer, writePath=rest|sdk
 */
export async function GET(request: Request) {
  try {
    const originError = requireTrustedTensorTxOrigin(request);
    if (originError) return originError;
    assertTensorTradeWriteEnabled();

    const params = new URL(request.url).searchParams;
    const ownerParam = params.get("owner");
    const mintParam = params.get("mint");
    const priceParam = params.get("price");
    const feePayerParam = params.get("feePayer") ?? ownerParam;
    const writePath = resolveListWritePath(params.get("writePath"));

    if (!ownerParam || !mintParam || !priceParam) {
      return NextResponse.json(
        { error: "owner, mint, and price are required." },
        { status: 400 },
      );
    }

    const challengeError = requireTradeTxWalletChallenge(request, ownerParam);
    if (challengeError) return challengeError;

    const priceLamports = parseLamportsParam("price", priceParam);

    const connection = getSolanaConnection();
    const { blockhash, lastValidBlockHeight } =
      await getLatestBlockhashContext(connection);

    if (writePath === "sdk") {
      const seller = parsePublicKeyParam("owner", ownerParam);
      const mint = parsePublicKeyParam("mint", mintParam);
      const feePayer = feePayerParam?.trim()
        ? parsePublicKeyParam("feePayer", feePayerParam)
        : seller;

      const tx = await buildListTransaction({
        connection,
        seller,
        mint,
        priceLamports,
      });

      return NextResponse.json(
        sdkTransactionResponse(tx, blockhash, lastValidBlockHeight, feePayer),
      );
    }

    if (!isTensorReadConfigured()) {
      return NextResponse.json(
        { error: TENSOR_REST_NOT_CONFIGURED_MESSAGE },
        { status: 503 },
      );
    }

    const data = await fetchTensorApiJson<unknown>("/api/v1/tx/list", {
      mint: mintParam,
      owner: ownerParam,
      price: priceParam,
      blockhash,
      feePayer: feePayerParam ?? ownerParam,
    });

    return NextResponse.json(restTransactionResponse(data));
  } catch (error) {
    if (error instanceof TensorBffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "List tx failed." },
      { status: 500 },
    );
  }
}
