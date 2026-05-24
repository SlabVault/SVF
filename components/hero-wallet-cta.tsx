"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { Button } from "@/components/ui/button";

type Props = {
  context?: string;
};

function HeroWalletCtaPlaceholder() {
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full sm:w-auto"
      disabled
      aria-busy="true"
      aria-label="Connect wallet"
    >
      Connect wallet
    </Button>
  );
}

function HeroWalletCtaImpl({ context = "home_hero" }: Props) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected) {
    return (
      <p className="rounded-full border border-line bg-vault-panel/60 px-4 py-2.5 text-sm text-muted">
        Wallet connected
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full sm:w-auto"
      onClick={() => setVisible(true)}
      data-growth-event="cta_connect_wallet_home_hero"
      data-growth-context={context}
    >
      Connect wallet
    </Button>
  );
}

/** Client-only — wallet hooks must not run during SSR (WalletProviderRoot is ssr:false). */
export const HeroWalletCta = dynamic(
  () => Promise.resolve({ default: HeroWalletCtaImpl }),
  {
    ssr: false,
    loading: HeroWalletCtaPlaceholder,
  },
);
