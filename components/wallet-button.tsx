"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  const { publicKey, connect, disconnect, connecting, wallet, wallets, select } =
    useWallet();
  const [message, setMessage] = useState<string | null>(null);

  const selectableWallet = useMemo(
    () =>
      wallets.find(
        ({ readyState }) =>
          readyState === WalletReadyState.Installed ||
          readyState === WalletReadyState.Loadable,
      ),
    [wallets],
  );

  const handleConnect = async () => {
    setMessage(null);

    const ensureWalletSelected = () => {
      if (wallet) return true;
      if (!selectableWallet?.adapter.name) {
        setMessage(
          "No wallet selected. Install or unlock Phantom/Solflare, then try again.",
        );
        return false;
      }
      select(selectableWallet.adapter.name);
      return true;
    };

    const isWalletNotSelectedError = (error: unknown) =>
      error instanceof Error && error.name === "WalletNotSelectedError";

    try {
      if (!ensureWalletSelected()) return;
      await connect();
    } catch (error) {
      if (isWalletNotSelectedError(error)) {
        if (!ensureWalletSelected()) return;
        setMessage(
          "Select a wallet first, then press Connect Wallet again.",
        );
        return;
      }

      if (error instanceof Error && error.message) {
        setMessage(error.message);
      } else {
        setMessage("Unable to connect wallet. Please try again.");
      }
      console.error("Wallet connect failed:", error);
    }
  };

  if (connecting) {
    return (
      <Button disabled className="transition-all duration-300">
        Connecting...
      </Button>
    );
  }

  if (publicKey) {
    const shortAddress = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
    return (
      <Button
        onClick={() => disconnect()}
        variant="outline"
        className="transition-all duration-300 hover:scale-105"
      >
        {shortAddress}
      </Button>
    );
  }

  return (
    <div className="space-y-1 text-right">
      <Button
        onClick={handleConnect}
        className="transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
      >
        Connect Wallet
      </Button>
      {message ? (
        <p className="max-w-[18rem] text-xs text-amber-300/90" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
