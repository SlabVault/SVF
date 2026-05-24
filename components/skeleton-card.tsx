import { Card } from "@/components/ui/card";
import { SLAB_CARD_BODY_CLASS, SLAB_CARD_SHELL_CLASS } from "@/lib/layout";

export function SkeletonCard() {
  return (
    <Card className={SLAB_CARD_SHELL_CLASS} aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-gradient-to-br from-vault-violet/20 to-vault-deep" />
      <div className={`${SLAB_CARD_BODY_CLASS} gap-3`}>
        <div className="space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-vault-panel" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-vault-panel/80" />
        </div>
        <div className="mt-auto space-y-2 border-t border-line pt-3">
          <div className="h-4 w-full animate-pulse rounded bg-vault-panel/70" />
          <div className="h-4 w-full animate-pulse rounded bg-vault-panel/70" />
          <div className="h-4 w-full animate-pulse rounded bg-vault-panel/70" />
        </div>
        <div className="mt-3 h-10 w-full animate-pulse rounded-md bg-vault-panel/60" />
      </div>
    </Card>
  );
}
