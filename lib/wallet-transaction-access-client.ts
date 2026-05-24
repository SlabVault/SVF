import {
  buildTransactionStatusAccessMessage,
  buildTransactionsListAccessMessage,
  TRANSACTION_ACCESS_TTL_MS,
} from "@/lib/wallet-transaction-access-messages";

type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;

function encodeAccessQuery(
  buyerWallet: string,
  accessExpires: string,
  walletSignature: string,
): string {
  const params = new URLSearchParams({
    buyerWallet,
    accessExpires,
    walletSignature,
  });
  return params.toString();
}

async function signAccessMessage(
  message: string,
  signMessage: SignMessageFn | undefined,
): Promise<string | null> {
  if (!signMessage) return null;

  const encodedMessage = new TextEncoder().encode(message);
  const signature = await signMessage(encodedMessage);
  return Buffer.from(signature).toString("base64");
}

export async function buildTransactionStatusAccessQuery(
  transactionId: string,
  buyerWallet: string,
  signMessage: SignMessageFn | undefined,
): Promise<string> {
  const accessExpires = new Date(Date.now() + TRANSACTION_ACCESS_TTL_MS).toISOString();
  const message = buildTransactionStatusAccessMessage(
    transactionId,
    buyerWallet,
    accessExpires,
  );
  const walletSignature = await signAccessMessage(message, signMessage);

  if (!walletSignature) {
    return `buyerWallet=${encodeURIComponent(buyerWallet)}`;
  }

  return encodeAccessQuery(buyerWallet, accessExpires, walletSignature);
}

export async function buildTransactionsListAccessQuery(
  buyerWallet: string,
  signMessage: SignMessageFn | undefined,
): Promise<string> {
  const accessExpires = new Date(Date.now() + TRANSACTION_ACCESS_TTL_MS).toISOString();
  const message = buildTransactionsListAccessMessage(buyerWallet, accessExpires);
  const walletSignature = await signAccessMessage(message, signMessage);

  if (!walletSignature) {
    return `buyerWallet=${encodeURIComponent(buyerWallet)}`;
  }

  return encodeAccessQuery(buyerWallet, accessExpires, walletSignature);
}
