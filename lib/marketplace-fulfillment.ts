import { Keypair } from "@solana/web3.js";

import { getDeployerWalletAddress } from "@/lib/marketplace-config";

/**
 * Parse deployer secret key from env.
 * Format: JSON byte array, e.g. [1,2,...,64] — never commit real keys.
 */
function parseSecretKey(secret: string): Uint8Array | null {
  try {
    const trimmed = secret.trim();
    if (!trimmed.startsWith("[")) return null;
    const arr = JSON.parse(trimmed) as number[];
    if (arr.length !== 64) return null;
    return Uint8Array.from(arr);
  } catch {
    return null;
  }
}

/**
 * Optional auto-fulfillment from deployer wallet.
 *
 * v1: Slab/NFT transfer from Collector Crypt deployer is typically manual.
 * When SERVER_WALLET_SECRET is set and matches the deployer pubkey, this
 * module can be extended to send on-chain assets. For now it validates
 * configuration only and returns null (manual fulfillment required).
 *
 * NEVER commit SERVER_WALLET_SECRET — set only in .env.local / Vercel env.
 */
export function getDeployerKeypair(): Keypair | null {
  const secret = process.env.SERVER_WALLET_SECRET?.trim();
  if (!secret) return null;

  try {
    const secretBytes = parseSecretKey(secret);
    if (!secretBytes) return null;

    const keypair = Keypair.fromSecretKey(secretBytes);
    const expected = getDeployerWalletAddress();

    if (keypair.publicKey.toBase58() !== expected) {
      console.warn(
        `SERVER_WALLET_SECRET pubkey ${keypair.publicKey.toBase58()} does not match DEPLOYER_WALLET_ADDRESS ${expected}`,
      );
      return null;
    }

    return keypair;
  } catch (error) {
    console.error("Invalid SERVER_WALLET_SECRET:", error);
    return null;
  }
}

export type FulfillmentResult = {
  autoFulfilled: boolean;
  fulfillmentSignature: string | null;
  message: string;
};

/**
 * Attempt auto-fulfillment after payment. v1 records manual fulfillment unless
 * a future Collector Crypt / NFT transfer integration is added.
 */
export async function attemptAutoFulfillment(params: {
  transactionId: string;
  buyerWallet: string;
  slabId: string;
}): Promise<FulfillmentResult> {
  const keypair = getDeployerKeypair();

  if (!keypair) {
    return {
      autoFulfilled: false,
      fulfillmentSignature: null,
      message:
        "Payment confirmed. Slab transfer from deployer wallet (slabvault.sol) is pending manual fulfillment.",
    };
  }

  // Placeholder: real slab transfer requires Collector Crypt / NFT API integration.
  console.info(
    `[fulfillment] Deployer key configured for ${keypair.publicKey.toBase58()}; manual fulfillment still required for v1 (tx ${params.transactionId}, slab ${params.slabId}).`,
  );

  return {
    autoFulfilled: false,
    fulfillmentSignature: null,
    message:
      "Deployer key present but auto slab transfer is not enabled in v1. Mark fulfillment complete in admin after transferring the slab.",
  };
}
