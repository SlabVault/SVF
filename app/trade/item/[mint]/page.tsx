import { redirect } from "next/navigation";

import { TRADE_ROUTES } from "@/lib/trade-routes";

type PageProps = {
  params: Promise<{ mint: string }>;
  searchParams: Promise<{ collection?: string }>;
};

/** Legacy route — canonical item pages live at `/trade/slab/[certOrMint]`. */
export default async function TradeItemLegacyRedirect({ params, searchParams }: PageProps) {
  const { mint } = await params;
  const { collection } = await searchParams;
  const query = collection ? `?collection=${encodeURIComponent(collection)}` : "";
  redirect(`${TRADE_ROUTES.slab(mint)}${query}`);
}
