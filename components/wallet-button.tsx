"use client";

import dynamic from "next/dynamic";
import { useWalletUiMessage } from "@/components/wallet-provider";
import { cn } from "@/lib/utils";

const WALLET_CONNECT_LABEL = "Select Wallet";

function WalletButtonPlaceholder() {
  return (
    <button
      type="button"
      className="wallet-adapter-button wallet-adapter-button-custom min-w-[9.5rem]"
      disabled
      aria-busy="true"
      aria-label="Connect wallet"
    >
      {WALLET_CONNECT_LABEL}
    </button>
  );
}

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then((mod) => ({
      default: mod.WalletMultiButton,
    })),
  {
    ssr: false,
    loading: WalletButtonPlaceholder,
  },
);

export function WalletButton({ className }: { className?: string }) {
  const { message } = useWalletUiMessage();

  return (
    <div className="space-y-1 text-right">
      <WalletMultiButton
        className={cn(
          "wallet-adapter-button-custom min-w-[9.5rem] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30",
          className,
        )}
      />
      {message ? (
        <p className="max-w-[18rem] text-xs text-amber-300/90" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
