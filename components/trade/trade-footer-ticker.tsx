"use client";

import { useEffect, useState } from "react";

import { formatSolUsdFooterPrice } from "@/lib/sol-price";
import { fetchSolanaTps, formatSolanaTpsLabel } from "@/lib/trade/solana-tps";
import {
  applyTradeFooterViewToDocument,
  readTradeFooterViewPreference,
  writeTradeFooterViewPreference,
  type TradeFooterView,
} from "@/lib/trade-footer-view-prefs";
import { cn } from "@/lib/utils";

type Props = {
  listedCount: number;
  floorSol?: number | null;
  volume24hSol?: number | null;
  solPriceUsd?: number | null;
  className?: string;
};

function FooterViewToggle({
  view,
  onChange,
}: {
  view: TradeFooterView;
  onChange: (next: TradeFooterView) => void;
}) {
  return (
    <span
      className="inline-flex rounded border border-[#333] bg-[var(--trade-panel)] p-0.5"
      role="group"
      aria-label="Footer density"
    >
      {(["lite", "pro"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={view === mode}
          className={cn(
            "rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors",
            view === mode
              ? "bg-[var(--tensor-accent)] text-white"
              : "text-[var(--trade-muted)] hover:text-[var(--tensor-white)]",
          )}
        >
          {mode}
        </button>
      ))}
    </span>
  );
}

/** Tensor-style bottom status bar — Live · Lite/Pro · market stats. */
export function TradeFooterTicker({
  listedCount,
  floorSol = null,
  volume24hSol = null,
  solPriceUsd = null,
  className,
}: Props) {
  const [view, setView] = useState<TradeFooterView>("pro");
  const [tpsLabel, setTpsLabel] = useState("—");

  useEffect(() => {
    const stored = readTradeFooterViewPreference();
    const initial = stored ?? "pro";
    setView(initial);
    applyTradeFooterViewToDocument(initial);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshTps = async () => {
      const tps = await fetchSolanaTps();
      if (!cancelled) setTpsLabel(formatSolanaTpsLabel(tps));
    };

    void refreshTps();
    const interval = window.setInterval(() => void refreshTps(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleViewChange = (next: TradeFooterView) => {
    setView(next);
    writeTradeFooterViewPreference(next);
    applyTradeFooterViewToDocument(next);
  };

  const isPro = view === "pro";

  return (
    <footer
      className={cn(
        "trade-footer-ticker flex h-7 shrink-0 items-center gap-2 overflow-x-auto border-t border-[#333] bg-[var(--tensor-black)] px-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--trade-muted)] sm:gap-3 sm:px-3 sm:text-[10px]",
        className,
      )}
      aria-label="GRAILS market status"
    >
      <span className="inline-flex items-center gap-1.5 text-[var(--tensor-white)]">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
          aria-hidden
        />
        Live
      </span>
      <FooterViewToggle view={view} onChange={handleViewChange} />
      {!isPro ? (
        <span className="normal-case tracking-normal text-[var(--trade-muted)]">
          Lite mode
        </span>
      ) : null}
      <span className="text-[var(--tensor-white)]">GRAILS</span>
      <span className="hidden sm:inline" aria-hidden>
        ·
      </span>
      <span className="font-mono tabular-nums normal-case tracking-normal">
        <span className="text-[var(--trade-muted)]">Partner listed </span>
        <span className="text-[var(--tensor-white)]">
          {listedCount > 0 ? listedCount : "—"}
        </span>
      </span>
      {isPro && floorSol != null ? (
        <span className="font-mono tabular-nums normal-case tracking-normal">
          <span className="text-[var(--trade-muted)]">Floor </span>
          <span className="text-[var(--tensor-white)]">{floorSol} ◎</span>
        </span>
      ) : null}
      <span className="font-mono tabular-nums normal-case tracking-normal">
        <span className="text-[var(--trade-muted)]">SOL </span>
        <span className="text-[var(--tensor-white)]">
          {formatSolUsdFooterPrice(solPriceUsd)}
        </span>
      </span>
      {isPro ? (
        <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[9px] normal-case tracking-normal sm:gap-3">
          <span>
            <span className="text-[var(--trade-muted)]">24h vol </span>
            <span className="text-[var(--tensor-white)]">
              {volume24hSol != null ? `${volume24hSol} ◎` : "—"}
            </span>
          </span>
          <span className="hidden text-[var(--trade-muted)] sm:inline" aria-hidden>
            ·
          </span>
          <span className="hidden sm:inline">
            <span className="text-[var(--trade-muted)]">TPS </span>
            <span className="text-[var(--tensor-white)]">{tpsLabel}</span>
          </span>
        </span>
      ) : null}
    </footer>
  );
}
