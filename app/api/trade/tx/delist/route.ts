import { NextResponse } from "next/server";

import { buildDelistTransaction } from "@/lib/onchain/clients/tensor-tcm";
import {
  assertTensorTradeWriteEnabled,
  requireTradeTxWalletChallenge,
  requireTrustedTensorTxOrigin,
  fetchTensorApiJson,
  getLatestBlockhashContext,
  getSolanaConnection,
  parsePublicKeyParam,
  resolveDelistWritePath,
  restTransactionResponse,
  sdkTransactionResponse,
  TensorBffError,
  TENSOR_REST_NOT_CONFIGURED_MESSAGE,
} from "@/lib/onchain/tensor-tx-bff";
import { isTensorReadConfigured } from "@/lib/integrations/tensor";

export const runtime = "nodejs";

/**
 * GET /api/trade/tx/delist
 * Tensor delist tx — REST proxy when keyed (vendor pattern) or SDK delist when write enabled.
 *
 * Query: owner, mint; optional writePath=rest|sdk
 */
export async function GET(request: Request) {
  try {
    const originError = requireTrustedTensorTxOrigin(request);
    if (originError) return originError;
    assertTensorTradeWriteEnabled();

    const params = new URL(request.url).searchParams;
    const ownerParam = params.get("owner");
    const mintParam = params.get("mint");
    const writePath = resolveDelistWritePath(params.get("writePath"));

    if (!ownerParam || !mintParam) {
      return NextResponse.json(
        { error: "owner and mint are required." },
        { status: 400 },
      );
    }

    const challengeError = requireTradeTxWalletChallenge(request, ownerParam);
    if (challengeError) return challengeError;

    const connection = getSolanaConnection();
    const { blockhash, lastValidBlockHeight } =
      await getLatestBlockhashContext(connection);

    if (writePath === "sdk") {
      const owner = parsePublicKeyParam("owner", ownerParam);
      const mint = parsePublicKeyParam("mint", mintParam);

      const tx = await buildDelistTransaction({
        connection,
        owner,
        mint,
      });

      return NextResponse.json(
        sdkTransactionResponse(tx, blockhash, lastValidBlockHeight, owner),
      );
    }

    if (!isTensorReadConfigured()) {
      return NextResponse.json(
        { error: TENSOR_REST_NOT_CONFIGURED_MESSAGE },
        { status: 503 },
      );
    }

    const data = await fetchTensorApiJson<unknown>("/api/v1/tx/delist", {
      owner: ownerParam,
      mint: mintParam,
      blockhash,
    });

    return NextResponse.json(restTransactionResponse(data));
  } catch (error) {
    if (error instanceof TensorBffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delist tx failed." },
      { status: 500 },
    );
  }
}
