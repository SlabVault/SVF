import Link from "next/link";
import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

type LegacyVariant = "primary" | "secondary" | "ghost";

const variantMap: Record<LegacyVariant, NonNullable<ButtonProps["variant"]>> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
};

type Props = {
  href: string;
  children: ReactNode;
  variant?: LegacyVariant;
  external?: boolean;
  className?: string;
  trackingEvent?: string;
  trackingContext?: string;
};

export function LinkButton({
  href,
  children,
  variant = "primary",
  external,
  className = "",
  trackingEvent,
  trackingContext,
}: Props) {
  const mapped = variantMap[variant];

  if (external) {
    return (
      <Button asChild variant={mapped} className={className}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          data-growth-event={trackingEvent}
          data-growth-context={trackingContext}
        >
          {children}
        </a>
      </Button>
    );
  }

  return (
    <Button asChild variant={mapped} className={className}>
      <Link
        href={href}
        data-growth-event={trackingEvent}
        data-growth-context={trackingContext}
      >
        {children}
      </Link>
    </Button>
  );
}
