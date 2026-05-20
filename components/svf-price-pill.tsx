import Link from "next/link";

import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  priceUsd: number | null;
  className?: string;
};

export function SvfPricePill({ priceUsd, className }: Props) {
  const label =
    priceUsd != null && Number.isFinite(priceUsd)
      ? formatUsd(priceUsd)
      : null;

  return (
    <Link
      href="/svf"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-vault-panel/80 px-2 py-0.5 text-[11px] font-medium transition-colors hover:border-vault-amber/50 hover:text-vault-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-2.5 sm:py-1 sm:text-xs",
        className,
      )}
      aria-label={label ? `$SVF live price ${label}` : "$SVF token stats"}
    >
      <span className="text-muted">$SVF</span>
      <span className="font-mono font-semibold text-foreground">
        {label ?? "—"}
      </span>
    </Link>
  );
}
