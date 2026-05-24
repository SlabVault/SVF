"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { VENUE_LABELS } from "@/components/trade/venue-badge";
import { SLABVAULT_TRADE_COLLECTIONS } from "@/lib/onchain/collections";
import { parseCertPrefixQuery } from "@/lib/trade/parse-cert-prefix-query";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

type PaletteItem =
  | { kind: "all_listings" }
  | { kind: "cert"; certPrefix: string }
  | {
      kind: "collection";
      slug: string;
      name: string;
      partner: string;
      status: string;
    };

function formatPartnerLabel(partner: string): string {
  return VENUE_LABELS[partner as keyof typeof VENUE_LABELS] ?? partner.replace(/_/g, " ");
}

/** Base58 mint — full resolver ships in M5. */
function looksLikeMintSearch(raw: string): boolean {
  const q = raw.trim();
  if (!q || q.length < 32 || q.length > 44) return false;
  if (q.includes("-")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(q);
}

export function TradeCommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const certPrefix = parseCertPrefixQuery(query);
  const mintDeferred = !certPrefix && looksLikeMintSearch(query);

  const items = useMemo((): PaletteItem[] => {
    const rows: PaletteItem[] = [];
    if (certPrefix) {
      rows.push({ kind: "cert", certPrefix });
    }

    const normalized = query.trim().toLowerCase();
    const showAllListings =
      !certPrefix &&
      (!normalized ||
        "all listings".includes(normalized) ||
        normalized.includes("all") ||
        normalized.includes("aggregate") ||
        normalized.includes("merged"));

    if (showAllListings) {
      rows.push({ kind: "all_listings" });
    }

    const collections = SLABVAULT_TRADE_COLLECTIONS.map((collection) => ({
      slug: collection.slug,
      name: collection.name,
      partner: collection.partner,
      status: collection.status,
    }));

    const filtered =
      normalized && !certPrefix
        ? collections.filter(
            (collection) =>
              collection.name.toLowerCase().includes(normalized) ||
              collection.slug.toLowerCase().includes(normalized) ||
              collection.partner.toLowerCase().includes(normalized),
          )
        : certPrefix
          ? []
          : collections;

    for (const collection of filtered) {
      rows.push({ kind: "collection", ...collection });
    }

    return rows;
  }, [certPrefix, query]);

  const navigateToCollection = useCallback(
    (slug: string) => {
      onClose();
      setQuery("");
      router.push(TRADE_ROUTES.collection(slug));
    },
    [onClose, router],
  );

  const navigateToAllListings = useCallback(() => {
    onClose();
    setQuery("");
    router.push(TRADE_ROUTES.all);
  }, [onClose, router]);

  const navigateToCert = useCallback(
    (prefix: string) => {
      onClose();
      setQuery("");
      router.push(TRADE_ROUTES.slab(prefix));
    },
    [onClose, router],
  );

  const activateItem = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      if (item.kind === "all_listings") {
        navigateToAllListings();
        return;
      }
      if (item.kind === "cert") {
        navigateToCert(item.certPrefix);
        return;
      }
      navigateToCollection(item.slug);
    },
    [navigateToAllListings, navigateToCert, navigateToCollection],
  );

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (mintDeferred || items.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % items.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + items.length) % items.length);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        activateItem(items[activeIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, activateItem, items, mintDeferred, onClose, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-3 pt-[12vh] backdrop-blur-[2px] sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search collections and cert numbers"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded border border-[#333] bg-[var(--tensor-black)] shadow-2xl">
        <label className="flex items-center gap-2 border-b border-[#333] px-3 py-2.5">
          <span className="sr-only">Search collections or cert number</span>
          <span className="text-[10px] font-mono text-[var(--trade-muted)]" aria-hidden>
            ⌘K
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search collections · cert # prefix · compare Soon"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--tensor-white)] placeholder:text-[var(--trade-muted)] focus-visible:outline-none"
          />
        </label>

        {mintDeferred ? (
          <p className="border-b border-[#333] px-3 py-2 text-[11px] leading-snug text-[var(--trade-muted)]">
            Mint search ships in <span className="font-semibold text-[var(--tensor-white)]">M5</span>.
            Use a cert # prefix (4+ digits) or collection name.
          </p>
        ) : null}

        <ul
          id="trade-command-palette-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-[min(24rem,50vh)] overflow-y-auto py-1 [scrollbar-width:thin]"
        >
          {mintDeferred ? null : items.length === 0 ? (
            <li className="px-3 py-4 text-xs leading-relaxed text-[var(--trade-muted)]">
              {query.trim() ? (
                <>
                  No matches for &ldquo;{query.trim()}&rdquo;. Try collection name, slug, partner,
                  or a cert # prefix (4+ digits).
                </>
              ) : (
                <>Type to filter collections or enter a cert # prefix.</>
              )}
            </li>
          ) : (
            items.map((item, index) => (
              <li
                key={
                  item.kind === "cert"
                    ? `cert-${item.certPrefix}`
                    : item.kind === "all_listings"
                      ? "all-listings"
                      : item.slug
                }
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors",
                    index === activeIndex
                      ? "bg-[var(--trade-surface)] text-[var(--tensor-white)]"
                      : "text-[var(--tensor-white)] hover:bg-[var(--trade-surface)]",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activateItem(item)}
                >
                  {item.kind === "all_listings" ? (
                    <>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">All listings</span>
                        <span className="block truncate font-mono text-[10px] text-[var(--trade-muted)]">
                          {TRADE_ROUTES.all} · CC · Phygitals · Treasury
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] uppercase text-[#641ae6]">
                        all
                      </span>
                    </>
                  ) : item.kind === "cert" ? (
                    <>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">Open cert #{item.certPrefix}</span>
                        <span className="block truncate font-mono text-[10px] text-[var(--trade-muted)]">
                          {TRADE_ROUTES.slab(item.certPrefix)} · multi-venue compare Soon
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] uppercase text-[#641ae6]">
                        cert
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.name}</span>
                        <span className="block truncate font-mono text-[10px] text-[var(--trade-muted)]">
                          {item.slug} · {formatPartnerLabel(item.partner)}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] uppercase text-[var(--trade-muted)]">
                        {item.status}
                      </span>
                    </>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>

        <p className="border-t border-[#333] px-3 py-2 text-[10px] text-[var(--trade-muted)]">
          {mintDeferred ? (
            <>Clear the field to browse collections, or enter a cert # prefix.</>
          ) : (
            <>
              {items.length > 0 ? (
                <span>
                  {items.length} result{items.length === 1 ? "" : "s"} ·{" "}
                </span>
              ) : null}
              ↑↓ navigate · Enter open · Esc close · Mint search in M5
            </>
          )}
        </p>
      </div>
    </div>
  );
}
