"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { type NavLink, type PublicNavStructure } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
  brandName: string;
  ticker: string;
  nav: PublicNavStructure;
};

function navLinkClass(active: boolean) {
  return cn(
    "shrink-0 rounded-md px-2 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:px-2.5 lg:text-sm",
    active ? "text-foreground" : "text-muted hover:text-foreground",
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navTrackingEvent(href: string): string {
  if (href === "/") return "nav_home";
  return `nav_${href.slice(1).replace(/\//g, "_")}`;
}

type NavDropdownProps = {
  label: string;
  items: readonly NavLink[];
  active: boolean;
  pathname: string;
  trackingContext: string;
  onNavigate?: () => void;
  align?: "left" | "right";
};

function NavDropdown({
  label,
  items,
  active,
  pathname,
  trackingContext,
  onNavigate,
  align = "right",
}: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={cn(
          navLinkClass(active),
          "inline-flex items-center gap-1",
          open && "text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        data-growth-event={`nav_${label.toLowerCase().replace(/\s+/g, "_")}_menu`}
        data-growth-context={trackingContext}
      >
        <span>{label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`${label} menu`}
          className={cn(
            "absolute top-[calc(100%+0.35rem)] z-[70] min-w-[13.5rem] overflow-hidden rounded-xl border border-line bg-vault-deep/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-md",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            const itemActive = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={itemActive ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-vault-deep",
                  itemActive
                    ? "bg-vault-panel text-foreground"
                    : "text-foreground/90 hover:bg-vault-panel/80 hover:text-foreground",
                )}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                data-growth-event={navTrackingEvent(item.href)}
                data-growth-context={trackingContext}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs text-muted">{item.description}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DesktopPrimaryNav({
  primary,
  more,
  pathname,
}: {
  primary: readonly NavLink[];
  more: readonly NavLink[];
  pathname: string;
}) {
  return (
    <nav
      aria-label="Primary navigation"
      className="hidden min-w-0 flex-1 items-center justify-end gap-x-0.5 overflow-x-auto sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {primary.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={navLinkClass(active)}
            data-growth-event={navTrackingEvent(item.href)}
            data-growth-context="site_nav_desktop"
          >
            {item.label}
          </Link>
        );
      })}

      <span
        className="mx-1 hidden h-4 w-px shrink-0 bg-line lg:block"
        aria-hidden="true"
      />

      <NavDropdown
        label="More"
        items={more}
        active={more.some((item) => isActivePath(pathname, item.href))}
        pathname={pathname}
        trackingContext="site_nav_desktop_more"
        align="right"
      />
    </nav>
  );
}

function MobileNavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="px-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted/80">
        {title}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function MobileNavLink({
  item,
  active,
  onNavigate,
  trackingContext,
}: {
  item: NavLink;
  active: boolean;
  onNavigate: () => void;
  trackingContext: string;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-h-12 rounded-lg border border-transparent px-4 py-3.5 text-sm font-semibold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-vault-deep",
        active
          ? "border-line bg-vault-panel text-foreground"
          : "text-foreground/90 hover:border-line hover:bg-vault-panel hover:text-foreground",
      )}
      onClick={onNavigate}
      data-growth-event={navTrackingEvent(item.href)}
      data-growth-context={trackingContext}
    >
      <span className="block">{item.label}</span>
      {item.description ? (
        <span className="mt-0.5 block text-xs font-normal text-muted">{item.description}</span>
      ) : null}
    </Link>
  );
}

export function SiteNav({
  brandName,
  ticker,
  nav,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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

  const closeMenu = () => setOpen(false);

  return (
    <>
      <DesktopPrimaryNav
        primary={nav.primary}
        more={nav.more}
        pathname={pathname}
      />

      <div className="flex items-center gap-3 sm:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 min-w-[5.25rem] rounded-lg px-4"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </Button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[60] sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            id={panelId}
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-line bg-vault-deep shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-5">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold">{brandName}</p>
                <p className="mt-1 text-xs text-muted">{ticker}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                ✕
              </Button>
            </div>
            <nav
              aria-label="Primary mobile navigation"
              className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
              <MobileNavSection title="Main">
                {nav.primary.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    item={item}
                    active={isActivePath(pathname, item.href)}
                    onNavigate={closeMenu}
                    trackingContext="site_nav_mobile"
                  />
                ))}
              </MobileNavSection>

              <MobileNavSection title="More">
                {nav.more.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    item={item}
                    active={isActivePath(pathname, item.href)}
                    onNavigate={closeMenu}
                    trackingContext="site_nav_mobile_more"
                  />
                ))}
              </MobileNavSection>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
