import { NextResponse } from "next/server";

import { fetchTensorCollectionsRaw } from "@/lib/onchain/tensor-api";
import { TensorBffError } from "@/lib/onchain/tensor-tx-bff";

export const runtime = "nodejs";

/** GET /api/trade/collection-stats — Tensor REST collections stats proxy. */
export async function GET(request: Request) {
  try {
    const collectionSlug = new URL(request.url).searchParams.get("collectionSlug");
    if (!collectionSlug) {
      return NextResponse.json(
        { error: "collectionSlug query param is required." },
        { status: 400 },
      );
    }

    const data = await fetchTensorCollectionsRaw(collectionSlug);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TensorBffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Collection stats failed.";
    const status = message.includes("TENSOR_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
