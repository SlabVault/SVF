import { Suspense } from "react";

import { TradeAppHeader } from "@/components/trade/trade-app-header";
import { TradeFooterTickerServer } from "@/components/trade/trade-footer-ticker-server";
import { TradeLayoutViewSync } from "@/components/trade/trade-layout-view-sync";

export default function TradeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="trade-layout flex min-h-dvh flex-col text-[var(--tensor-white)]">
      <TradeLayoutViewSync />
      <Suspense fallback={null}>
        <TradeAppHeader />
      </Suspense>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <TradeFooterTickerServer />
    </div>
  );
}
