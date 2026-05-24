"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function TradeModalShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (event.key !== "Tab" || !panelRef.current) return;

    const focusables = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((node) => node.offsetParent !== null);

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      trapFocus(event);
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, trapFocus]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-2 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative flex max-h-[min(92vh,43rem)] w-full max-w-[570px] flex-col overflow-hidden",
          "rounded-lg border border-[#333] bg-[var(--tensor-black)] shadow-2xl shadow-black/50",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-2 border-b border-[#333] px-3 py-2.5">
          <div className="min-w-0 space-y-0.5">
            <h2
              id={titleId}
              className="truncate text-sm font-semibold text-[var(--tensor-white)]"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="text-[11px] leading-snug text-[var(--trade-muted)]"
              >
                {description}
              </p>
            ) : null}
          </div>
          <Button
            ref={closeRef}
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-[var(--trade-muted)] hover:text-[var(--tensor-white)]"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </Button>
        </header>

        <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">{children}</div>

        {footer ? (
          <footer className="border-t border-[#333] bg-[var(--trade-surface)] px-3 py-2.5">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
