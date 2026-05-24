export const TRANSACTION_ACCESS_TTL_MS = 5 * 60 * 1000;

export function buildTransactionStatusAccessMessage(
  transactionId: string,
  buyerWallet: string,
  expiresAt: string,
): string {
  return [
    "SlabVaultFi transaction access",
    `Transaction: ${transactionId}`,
    `Wallet: ${buyerWallet}`,
    `Expires: ${expiresAt}`,
  ].join("\n");
}

export function buildTransactionsListAccessMessage(
  buyerWallet: string,
  expiresAt: string,
): string {
  return [
    "SlabVaultFi transactions access",
    `Wallet: ${buyerWallet}`,
    `Expires: ${expiresAt}`,
  ].join("\n");
}
