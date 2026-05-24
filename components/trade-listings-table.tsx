"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlabImage } from "@/components/slab-image";
import { formatDate, formatUsd } from "@/lib/format";
import type { TradeListing } from "@/lib/trade-listings";

type Props = {
  listings: TradeListing[];
};

export function TradeListingsTable({ listings }: Props) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-vault-panel/30">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-line bg-vault-deep/40 text-xs uppercase tracking-[0.08em] text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Item
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Grade
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
              Listed
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Ask
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
              FMV
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr
              key={listing.id}
              className="border-b border-line/70 last:border-b-0 hover:bg-vault-panel/40"
            >
              <td className="px-4 py-3">
                <div className="flex min-w-[12rem] items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-vault-deep">
                    <SlabImage
                      src={listing.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="font-medium text-foreground">{listing.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="grade">{listing.grade}</Badge>
              </td>
              <td className="hidden px-4 py-3 text-muted sm:table-cell">
                {formatDate(listing.acquiredAt, "—", "en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-vault-amber">
                {listing.askSol} SOL
              </td>
              <td className="hidden px-4 py-3 font-mono text-foreground md:table-cell">
                {listing.estimatedValueUsd != null
                  ? formatUsd(listing.estimatedValueUsd)
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {connected ? (
                  <Button size="sm" disabled aria-disabled="true">
                    Buy soon
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => setVisible(true)}
                    data-growth-event="cta_connect_wallet_trade_table"
                    data-growth-context={`trade_listing:${listing.id}`}
                  >
                    Connect
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
