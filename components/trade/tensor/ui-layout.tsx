"use client";

import { Suspense, type ReactNode } from "react";

/** Ported from vendor/marketplace-nextjs-template/web/components/ui/ui-layout.tsx */
export function TensorUiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tensor-ui-layout flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="py-16 text-center">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--trade-line)] border-t-[var(--tensor-accent)]" />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}

export function ellipsify(str = "", len = 4) {
  if (str.length > 30) {
    return str.substring(0, len) + ".." + str.substring(str.length - len);
  }
  return str;
}

/** Vendor toast pattern — opens Solscan when a buy/list tx lands. */
export function tensorTransactionToast(signature: string) {
  if (typeof window === "undefined") return;
  window.open(
    `https://solscan.io/tx/${signature}`,
    "_blank",
    "noopener,noreferrer",
  );
}
