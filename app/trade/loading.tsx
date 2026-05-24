import { PageLoadingCard } from "@/components/page-loading-card";

export default function TradeLoading() {
  return (
    <div className="trade-layout flex min-h-[50vh] items-center justify-center p-6">
      <PageLoadingCard title="Loading trade desk…" />
    </div>
  );
}
