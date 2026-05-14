"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

type NavItem = { href: string; label: string };

type Props = {
  brandName: string;
  ticker: string;
  items: readonly NavItem[];
};

export function SiteNav({ brandName, ticker, items }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="hidden items-center gap-x-5 text-sm md:flex"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`transition-colors hover:text-foreground ${
              pathname === item.href ? "text-foreground" : "text-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center md:hidden">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-line bg-vault-panel px-3 py-2 text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-amber"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-line bg-vault-deep shadow-2xl"
          >
            <div className="border-b border-line px-5 py-4">
              <p className="font-display text-lg font-semibold">{brandName}</p>
              <p className="mt-1 text-xs text-muted">{ticker}</p>
            </div>
            <nav aria-label="Primary mobile" className="flex flex-1 flex-col gap-1 p-3">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-3 text-sm font-semibold transition-colors hover:bg-vault-panel ${
                    pathname === item.href
                      ? "bg-vault-panel text-foreground"
                      : "text-muted"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
