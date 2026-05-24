import { Badge } from "@/components/ui/badge";
import {
  getPlatformBadgeLabel,
  type PlatformBadgeKind,
} from "@/lib/platform-labels";
import type { ExternalListingSource } from "@/types/external-listing";
import { cn } from "@/lib/utils";

type Props = {
  kind: PlatformBadgeKind;
  externalSource?: ExternalListingSource;
  className?: string;
};

export function PlatformBadge({ kind, externalSource, className }: Props) {
  const label = getPlatformBadgeLabel(kind, externalSource);
  const variant =
    kind === "slabvault" || kind === "slabvault_vault"
      ? "default"
      : kind === "experimental"
        ? "secondary"
        : "default";

  return (
    <Badge variant={variant} className={cn("shadow-sm", className)}>
      {label}
    </Badge>
  );
}
