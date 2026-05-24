"use client";

import type { PaymentSplit } from "@/lib/marketplace-split";
import { cn } from "@/lib/utils";

type SplitOption = {
  id: PaymentSplit;
  title: string;
  description: string;
};

const OPTIONS: SplitOption[] = [
  {
    id: "FIXED_DUAL",
    title: "Fixed listing split",
    description: "Use the slab's default SOL + SVF listing amounts.",
  },
  {
    id: "SOL_80_SVF_20",
    title: "80/20 weighted split",
    description: "Bias payment toward SOL while keeping an SVF component.",
  },
];

type Props = {
  value: PaymentSplit;
  onChange: (value: PaymentSplit) => void;
  disabled?: boolean;
};

export function MarketplacePaymentSplit({ value, onChange, disabled = false }: Props) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">Payment mode</legend>
      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const active = option.id === value;
          const descriptionId = `payment-split-${option.id}-description`;
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                active
                  ? "border-vault-amber bg-vault-amber/10"
                  : "border-line bg-vault-panel/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="payment-split"
                value={option.id}
                checked={active}
                onChange={() => onChange(option.id)}
                disabled={disabled}
                aria-describedby={descriptionId}
                className="mt-1 h-4 w-4 accent-vault-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-foreground">
                  {option.title}
                </span>
                <span id={descriptionId} className="block text-xs text-muted">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
