import Link from "next/link";

type Props = {
  brandName: string;
  ticker: string;
};

const nav = [
  { href: "/", label: "Home" },
  { href: "/vault", label: "Vault" },
  { href: "/pulls", label: "Pulls" },
  { href: "/community", label: "Community" },
] as const;

export function SiteHeader({ brandName, ticker }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-vault-void/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-vault-amber">
            {brandName}
          </span>
          <span className="rounded-full border border-line bg-vault-panel px-2 py-0.5 text-xs font-medium text-muted">
            {ticker}
          </span>
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
