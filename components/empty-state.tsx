import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, children, className }: Props) {
  return (
    <Card
      className={cn(
        "col-span-full space-y-4 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 p-8 text-center sm:p-10",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="font-display text-xl font-semibold text-foreground sm:text-2xl">
        {title}
      </p>
      <p className="mx-auto max-w-prose text-sm text-muted sm:text-base">
        {description}
      </p>
      {children ? (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {children}
        </div>
      ) : null}
    </Card>
  );
}
