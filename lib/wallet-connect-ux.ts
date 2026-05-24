type WalletErrorLike = {
  name: string;
  message?: string;
};

export function mapWalletErrorToMessage(error: WalletErrorLike): string {
  const name = error.name.toLowerCase();
  const text = (error.message || "").toLowerCase();

  if (name.includes("walletnotselected")) {
    return "Choose a wallet in the modal, then connect.";
  }

  if (
    text.includes("plugin closed") ||
    text.includes("window closed") ||
    text.includes("popup closed") ||
    text.includes("window was closed")
  ) {
    return "Wallet popup was closed before approval. Re-open and approve to continue.";
  }

  if (text.includes("rejected") || text.includes("declined")) {
    return "Wallet connection request was rejected. Try again when ready.";
  }

  return error.message || "Unable to connect wallet. Please try again.";
}

export function shouldClearWalletUiMessage(
  connected: boolean,
  connecting: boolean,
): boolean {
  return connected || connecting;
}
