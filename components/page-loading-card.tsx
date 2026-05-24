import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  className?: string;
};

export function PageLoadingCard({ title, description, className }: Props) {
  return (
    <Card
      className={cn("space-y-4 p-8 text-center sm:p-10", className)}
      role="status"
      aria-live="polite"
    >
      <div
        className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-vault-violet/30 border-t-vault-amber"
        aria-hidden="true"
      />
      <p className="font-display text-xl font-semibold text-foreground sm:text-2xl">
        {title}
      </p>
      {description ? (
        <p className="mx-auto max-w-prose text-sm text-muted">{description}</p>
      ) : null}
    </Card>
  );
}
