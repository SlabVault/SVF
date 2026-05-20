"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  const { publicKey, connect, disconnect, connecting } = useWallet();

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
    <Button
      onClick={() => connect()}
      className="transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-vault-violet/30"
    >
      Connect Wallet
    </Button>
  );
}
