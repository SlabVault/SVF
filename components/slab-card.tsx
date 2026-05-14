import Link from "next/link";
import type { SlabItem } from "@/types/content";
import { formatUsd } from "@/lib/format";

type Props = {
  slab: SlabItem;
};

export function SlabCard({ slab }: Props) {
  const value =
    slab.estimatedValueUsd != null ? formatUsd(slab.estimatedValueUsd) : "—";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-vault-panel/60">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-vault-violet/20 to-vault-deep">
        {slab.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic URLs from JSON
          <img
            src={slab.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted">
            Add <span className="mx-1 font-mono text-xs">imageUrl</span> in{" "}
            <span className="mx-1 font-mono text-xs">data/slabs.json</span>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full border border-line bg-vault-void/70 px-3 py-1 text-xs font-semibold text-vault-amber backdrop-blur">
          {slab.grade}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-base font-semibold leading-snug">
            {slab.name}
          </h3>
          <p className="mt-1 text-xs text-muted">Acquired {slab.acquiredAt}</p>
        </div>
        <p className="text-sm text-muted">
          Est. value: <span className="font-mono text-foreground">{value}</span>
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          {slab.vaultedUrl ? (
            <Link
              href={slab.vaultedUrl}
              className="text-xs font-semibold text-vault-amber underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Vaulted
            </Link>
          ) : null}
          {slab.collectrUrl ? (
            <Link
              href={slab.collectrUrl}
              className="text-xs font-semibold text-vault-amber underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Collectr
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
