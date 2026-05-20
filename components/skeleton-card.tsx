import { Card } from "@/components/ui/card";

export function SkeletonCard() {
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="aspect-[4/3] bg-gradient-to-br from-vault-violet/20 to-vault-deep animate-pulse" />
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="space-y-2">
          <div className="h-6 w-3/4 animate-pulse rounded bg-vault-panel" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-vault-panel" />
        </div>
        <div className="h-4 w-1/3 animate-pulse rounded bg-vault-panel" />
        <div className="mt-auto flex gap-2">
          <div className="h-8 w-24 animate-pulse rounded bg-vault-panel" />
          <div className="h-8 w-20 animate-pulse rounded bg-vault-panel" />
        </div>
      </div>
    </Card>
  );
}
