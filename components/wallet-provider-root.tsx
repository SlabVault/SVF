"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const WalletProvider = dynamic(
  () =>
    import("@/components/wallet-provider").then((mod) => ({
      default: mod.WalletProvider,
    })),
  { ssr: false },
);

/** Client-only wallet shell — avoids SSR/hydration side-effects from wallet adapters. */
export function WalletProviderRoot({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
