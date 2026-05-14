import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "border border-vault-amber/40 bg-vault-amber text-vault-void shadow-[0_0_0_1px_rgba(251,191,36,0.15)] hover:bg-vault-amber/90",
  secondary:
    "border border-line bg-vault-panel text-foreground hover:border-vault-violet/40 hover:text-foreground",
  ghost: "border border-transparent text-muted hover:text-foreground",
};

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  external?: boolean;
  className?: string;
};

export function LinkButton({
  href,
  children,
  variant = "primary",
  external,
  className = "",
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-amber";

  if (external) {
    return (
      <a
        href={href}
        className={`${base} ${styles[variant]} ${className}`}
        target="_blank"
        rel="noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
