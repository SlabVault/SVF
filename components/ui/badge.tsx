import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "rounded-full border-vault-amber/35 bg-vault-amber/15 text-vault-amber",
        secondary:
          "rounded-full border-line bg-vault-panel text-muted",
        outline: "rounded-full border-line text-muted",
        live: "rounded-full border-vault-mint/40 bg-vault-mint/10 text-vault-mint",
        grade:
          "rounded-full border-line bg-vault-void/75 text-vault-amber backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
