"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { INTERNAL_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

type Props = {
  brandName: string;
  ticker: string;
  items?: readonly NavItem[];
};

function navLinkClass(active: boolean) {
  return cn(
    "shrink-0 rounded-md px-2 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:px-2.5 lg:text-sm",
    active ? "text-foreground" : "text-muted hover:text-foreground",
  );
}

export function SiteNav({
  brandName,
  ticker,
  items = INTERNAL_NAV,
}: Props) {
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

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarCompensation =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarCompensation > 0) {
      document.body.style.paddingRight = `${scrollbarCompensation}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="hidden min-w-0 flex-1 items-center justify-end gap-x-0.5 overflow-x-auto sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={navLinkClass(pathname === item.href)}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center sm:hidden">
        <Button
          type="button"
          variant="outline"
          size="default"
          className="min-h-11 min-w-[5.5rem] rounded-lg"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </Button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[60] sm:hidden"
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
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-display text-lg font-semibold">{brandName}</p>
                <p className="mt-1 text-xs text-muted">{ticker}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </Button>
            </div>
            <nav
              aria-label="Primary mobile navigation"
              className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
            >
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-vault-deep",
                    pathname === item.href
                      ? "bg-vault-panel text-foreground"
                      : "text-muted hover:bg-vault-panel hover:text-foreground",
                  )}
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
