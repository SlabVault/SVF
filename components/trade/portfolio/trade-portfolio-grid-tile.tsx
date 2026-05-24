"use client";

import Link from "next/link";

import { SlabImage } from "@/components/slab-image";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import type { PortfolioNft } from "@/lib/trade/portfolio";
import { cn } from "@/lib/utils";

type Props = {
  nft: PortfolioNft;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  priority?: boolean;
};

function resolveTraitChips(nft: PortfolioNft): string[] {
  const chips: string[] = [];
  const year = nft.attributes.find((a) => /year/i.test(a.trait_type))?.value;
  const set = nft.attributes.find((a) => /set/i.test(a.trait_type))?.value;
  if (year) chips.push(year);
  if (set) chips.push(set);
  if (chips.length === 0 && nft.attributes[0]) {
    chips.push(nft.attributes[0].value);
  }
  return chips.slice(0, 2);
}

/** Single portfolio inventory tile â€” YOU badge, traits, list state. */
export function TradePortfolioGridTile({
  nft,
  selected,
  onToggleSelect,
  priority = false,
}: Props) {
  const mintOrId = nft.mint ?? nft.id;
  const href = TRADE_ROUTES.slab(mintOrId);
  const chips = resolveTraitChips(nft);

  return (
    <article
      className={cn(
        "trade-listing-card nft-card relative overflow-hidden text-sm",
        selected && "ring-1 ring-[var(--tensor-accent)]",
      )}
    >
      <div className="absolute left-1.5 top-1.5 z-10 flex items-start gap-1">
        <span className="rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
          YOU
        </span>
        <label className="flex h-4 w-4 cursor-pointer items-center justify-center rounded border border-[#333] bg-[var(--tensor-black)]/80">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(nft.id)}
            className="h-3 w-3 accent-[var(--tensor-accent)]"
            aria-label={`Select ${nft.name}`}
          />
        </label>
      </div>

      <Link
        href={href}
        className="relative mx-2 mt-6 block aspect-square overflow-hidden rounded-md bg-[var(--trade-surface)]"
      >
        {nft.imageUri ? (
          <SlabImage
            src={nft.imageUri}
            alt={nft.name}
            className="h-full w-full object-cover"
            priority={priority}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-xs text-[var(--trade-muted)]"
            aria-hidden
          >
            —
          </span>
        )}
      </Link>

      <div className="space-y-1 px-2 pb-2 pt-1">
        <p className="truncate text-[11px] font-medium text-[var(--tensor-white)]">{nft.name}</p>
        <div className="flex flex-wrap gap-1">
          <span className="rounded bg-[var(--trade-panel)] px-1.5 py-0.5 text-[9px] text-[var(--trade-muted)]">
            â™¥ 0
          </span>
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded bg-[var(--trade-panel)] px-1.5 py-0.5 text-[9px] text-[var(--trade-muted)]"
            >
              {chip}
            </span>
          ))}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--trade-muted)]">
          {nft.listed ? `${nft.askSol?.toFixed(4) ?? "—"} ◎` : "UNLISTED"}
        </p>
      </div>
    </article>
  );
}
