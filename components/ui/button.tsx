import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 motion-safe:active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border border-vault-amber/40 bg-vault-amber text-vault-void shadow-[0_0_0_1px_rgba(251,191,36,0.15)] hover:bg-vault-amber/90",
        secondary:
          "border border-line bg-vault-panel text-foreground hover:border-vault-violet/40 hover:bg-vault-panel/80",
        ghost:
          "border border-transparent text-muted hover:bg-vault-panel/40 hover:text-foreground",
        outline:
          "border border-line bg-vault-panel/40 text-foreground hover:border-vault-violet/40 hover:bg-vault-panel/70",
        link: "rounded-md border-transparent text-vault-amber underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-5 py-2.5",
        sm: "min-h-9 gap-1.5 rounded-lg px-3 text-xs",
        lg: "min-h-11 px-6 text-base",
        icon: "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
