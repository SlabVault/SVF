"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSolBalanceLamports } from "@/lib/solana-config";
import {
  PORTFOLIO_WALLET_MENU,
  portfolioTabHref,
  type PortfolioTabId,
} from "@/lib/trade/portfolio";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { cn } from "@/lib/utils";

type Props = {
  activeTab?: PortfolioTabId;
  className?: string;
};

function formatSolBalance(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}

function resolveWalletLabel(walletName: string | undefined, address: string): string {
  if (walletName?.trim()) return walletName.trim().slice(0, 12).toLowerCase();
  return address.slice(0, 8).toLowerCase();
}

/** Tensor-style connected wallet chip + dropdown menu. */
export function TradeWalletMenu({ activeTab = "inventory", className }: Props) {
  const { connected, publicKey, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [open, setOpen] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const address = publicKey?.toBase58() ?? null;
  const walletLabel = address ? resolveWalletLabel(wallet?.adapter.name, address) : null;

  useEffect(() => {
    if (!connected || !publicKey) {
      setSolBalance(null);
      return;
    }

    let cancelled = false;

    void fetchSolBalanceLamports(connection, publicKey).then((lamports) => {
      if (!cancelled) setSolBalance(lamports);
    });

    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, connection]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleDisconnect = useCallback(async () => {
    setOpen(false);
    await disconnect();
  }, [disconnect]);

  if (!connected || !address || !walletLabel) return null;

  return (
    <div ref={rootRef} className={cn("relative flex items-center gap-2", className)}>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded border border-[#333] bg-[var(--trade-surface)] text-[var(--trade-muted)] hover:text-[var(--tensor-white)]"
        aria-label="Notifications (coming soon)"
        disabled
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M10 2a5 5 0 0 0-5 5v2.26l-.95 1.9A1 1 0 0 0 5 12h10a1 1 0 0 0 .95-1.44L15 9.26V7a5 5 0 0 0-5-5Zm0 14a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2Z" />
        </svg>
      </button>

      <span className="hidden font-mono text-[11px] tabular-nums text-[var(--tensor-white)] sm:inline">
        {solBalance != null ? formatSolBalance(solBalance) : "\u2014"}
      </span>

      <button
        type="button"
        className="inline-flex max-w-[9rem] items-center gap-1.5 truncate rounded border border-[#333] bg-[var(--trade-surface)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--tensor-white)] hover:border-[var(--tensor-accent)] sm:max-w-[10rem]"
        aria-expanded={open}
        aria-haspopup="menu"
        title={address}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{walletLabel}</span>
        <svg
          viewBox="0 0 12 12"
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          fill="currentColor"
          aria-hidden
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-56 rounded border border-[#333] bg-[var(--tensor-black)] py-1 shadow-xl"
        >
          {PORTFOLIO_WALLET_MENU.map((item) => {
            const { id, label } = item;
            const soon = "soon" in item ? item.soon : false;
            const active = id === activeTab;
            const href =
              id === "inventory"
                ? TRADE_ROUTES.portfolio
                : id === "locks"
                  ? `${TRADE_ROUTES.portfolio}?tab=locks`
                  : portfolioTabHref(id as PortfolioTabId);

            return (
              <Link
                key={id}
                href={href}
                role="menuitem"
                className={cn(
                  "block px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                  active
                    ? "bg-[var(--tensor-accent)]/20 text-[var(--tensor-accent)]"
                    : "text-[var(--tensor-white)] hover:bg-[var(--trade-surface)]",
                  soon && "text-[var(--trade-muted)]",
                )}
                onClick={() => setOpen(false)}
              >
                {label}
                {soon ? (
                  <span className="ml-1 text-[9px] font-normal normal-case">Soon</span>
                ) : null}
              </Link>
            );
          })}

          <div className="my-1 border-t border-[#333]" role="separator" />

          {[
            { label: "AUTHENTICATE", soon: true },
            { label: "APP SETTINGS", soon: true },
          ].map(({ label, soon }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              disabled={soon}
              className="block w-full px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]"
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--tensor-white)] hover:bg-[var(--trade-surface)]"
            onClick={() => {
              setOpen(false);
              setVisible(true);
            }}
          >
            CHANGE WALLET
          </button>

          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--tensor-white)] hover:bg-[var(--trade-surface)]"
            onClick={() => void handleDisconnect()}
          >
            DISCONNECT
          </button>

          <div className="mt-1 border-t border-[#333] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--trade-muted)]">
              List Collection
            </p>
            <p className="mt-1.5 text-[10px] text-[var(--trade-muted)]">
              <span className="hover:text-[var(--tensor-white)]">Help</span>
              <span aria-hidden> · </span>
              <span className="hover:text-[var(--tensor-white)]">Terms</span>
              <span aria-hidden> · </span>
              <span className="hover:text-[var(--tensor-white)]">Privacy</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
