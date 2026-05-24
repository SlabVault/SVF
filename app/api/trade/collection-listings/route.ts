import { NextResponse } from "next/server";

import { fetchTensorMintCollectionRaw } from "@/lib/onchain/tensor-api";
import { TensorBffError } from "@/lib/onchain/tensor-tx-bff";

export const runtime = "nodejs";

/** GET /api/trade/collection-listings — Tensor REST mint/collection proxy (vendor pattern). */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const collectionSlug = params.get("collectionSlug");
    const limit = params.get("limit") ?? "50";
    const cursor = params.get("cursor") ?? undefined;
    const mint = params.get("mint") ?? undefined;

    if (!collectionSlug) {
      return NextResponse.json(
        { error: "collectionSlug query param is required." },
        { status: 400 },
      );
    }

    const data = await fetchTensorMintCollectionRaw({
      slug: collectionSlug,
      limit,
      cursor,
      mint,
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TensorBffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Collection listings failed.";
    const status = message.includes("TENSOR_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
