"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ConnectionProvider,
  useWallet,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletError } from "@solana/wallet-adapter-base";
import {
  isSolanaRpcExplicitlyConfigured,
  resolveClientSolanaRpcUrl,
  shouldSuppressRpcRejection,
  SOLANA_RPC_CONFIG_MESSAGE,
} from "@/lib/solana-config";
import {
  mapWalletErrorToMessage,
  shouldClearWalletUiMessage,
} from "@/lib/wallet-connect-ux";

import "@solana/wallet-adapter-react-ui/styles.css";

type WalletUiContextValue = {
  message: string | null;
  clearMessage: () => void;
};

const WalletUiContext = createContext<WalletUiContextValue | null>(null);

export function useWalletUiMessage(): WalletUiContextValue {
  const ctx = useContext(WalletUiContext);
  if (!ctx) {
    return {
      message: null,
      clearMessage: () => undefined,
    };
  }
  return ctx;
}

function WalletUiMessageSync() {
  const { connected, connecting } = useWallet();
  const { clearMessage } = useWalletUiMessage();

  useEffect(() => {
    if (shouldClearWalletUiMessage(connected, connecting)) clearMessage();
  }, [connected, connecting, clearMessage]);

  return null;
}

/** Wallet Standard auto-detects Phantom, Solflare, etc. — avoid duplicate adapter registration. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => resolveClientSolanaRpcUrl(), []);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSolanaRpcExplicitlyConfigured()) {
      console.info(SOLANA_RPC_CONFIG_MESSAGE);
    }
  }, []);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (shouldSuppressRpcRejection(event.reason)) {
        event.preventDefault();
        console.warn(SOLANA_RPC_CONFIG_MESSAGE);
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  const handleWalletError = useCallback((error: WalletError) => {
    setMessage(mapWalletErrorToMessage(error));
    console.error("Wallet adapter error:", error);
  }, []);
  const clearMessage = useCallback(() => setMessage(null), []);
  const value = useMemo(
    () => ({ message, clearMessage }),
    [message, clearMessage],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider
        wallets={[]}
        autoConnect={false}
        onError={handleWalletError}
      >
        <WalletModalProvider>
          <WalletUiContext.Provider value={value}>
            <WalletUiMessageSync />
            {children}
          </WalletUiContext.Provider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
