import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@/lib/spl-token-lite";

import {
  getSolanaRpcUrl,
  getSvfTokenMint,
  getTreasuryWalletAddress,
} from "@/lib/marketplace-config";

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

/**
 * Verify a confirmed SOL transfer from buyer to treasury for the expected amount.
 */
export async function verifySolPayment(
  signature: string,
  buyerWallet: string,
  expectedSol: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const connection = new Connection(getSolanaRpcUrl(), "confirmed");
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx?.meta || tx.meta.err) {
      return { ok: false, error: "Transaction not found or failed on-chain" };
    }

    const treasury = new PublicKey(getTreasuryWalletAddress());
    const buyer = new PublicKey(buyerWallet);
    const accountKeys = tx.transaction.message.accountKeys.map((k) =>
      k.pubkey.toBase58(),
    );

    const treasuryIndex = accountKeys.indexOf(treasury.toBase58());
    const buyerIndex = accountKeys.indexOf(buyer.toBase58());

    if (treasuryIndex === -1) {
      return { ok: false, error: "Treasury wallet not in transaction" };
    }
    if (buyerIndex === -1) {
      return { ok: false, error: "Buyer wallet not in transaction" };
    }

    const pre = tx.meta.preBalances[treasuryIndex] ?? 0;
    const post = tx.meta.postBalances[treasuryIndex] ?? 0;
    const receivedLamports = post - pre;
    const expectedLamports = Math.floor(expectedSol * LAMPORTS_PER_SOL);

    // Allow 1% tolerance for fee quirks on small amounts
    const minLamports = Math.floor(expectedLamports * 0.99);
    if (receivedLamports < minLamports) {
      return {
        ok: false,
        error: `Insufficient SOL: expected ~${expectedSol}, treasury received ${receivedLamports / LAMPORTS_PER_SOL}`,
      };
    }

    // Confirm buyer paid (balance decreased)
    const buyerPre = tx.meta.preBalances[buyerIndex] ?? 0;
    const buyerPost = tx.meta.postBalances[buyerIndex] ?? 0;
    if (buyerPost >= buyerPre) {
      return { ok: false, error: "Buyer balance did not decrease" };
    }

    return { ok: true };
  } catch (error) {
    console.error("SOL payment verification failed:", error);
    return { ok: false, error: "Failed to verify SOL payment" };
  }
}

/**
 * Verify an SPL token transfer from buyer to treasury for the expected SVF amount.
 * v1: SVF is transferred to treasury (escrow); manual burn or redistribution off-chain.
 */
export async function verifySvfPayment(
  signature: string,
  buyerWallet: string,
  expectedSvf: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const connection = new Connection(getSolanaRpcUrl(), "confirmed");
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx?.meta || tx.meta.err) {
      return { ok: false, error: "SVF transaction not found or failed" };
    }

    const mint = new PublicKey(getSvfTokenMint());
    const treasury = new PublicKey(getTreasuryWalletAddress());
    const buyer = new PublicKey(buyerWallet);

    const treasuryAta = getAssociatedTokenAddressSync(mint, treasury);
    const buyerAta = getAssociatedTokenAddressSync(mint, buyer);

    const inner = tx.meta.innerInstructions ?? [];
    const topLevel = tx.transaction.message.instructions;

    type ParsedIx = {
      programId?: PublicKey;
      parsed?: {
        type?: string;
        info?: {
          source?: string;
          destination?: string;
          mint?: string;
          tokenAmount?: { uiAmount?: number; amount?: string; decimals?: number };
        };
      };
    };

    const allInstructions: ParsedIx[] = [
      ...(topLevel as ParsedIx[]),
      ...inner.flatMap((i) => i.instructions as ParsedIx[]),
    ];

    for (const ix of allInstructions) {
      if (ix.programId?.toBase58() !== TOKEN_PROGRAM_ID.toBase58()) continue;
      const info = ix.parsed?.info;
      if (!info) continue;

      const isTransfer =
        ix.parsed?.type === "transfer" || ix.parsed?.type === "transferChecked";
      if (!isTransfer) continue;

      const source = info.source;
      const destination = info.destination;
      const transferMint = info.mint;

      const matchesRoute =
        (source === buyerAta.toBase58() &&
          destination === treasuryAta.toBase58()) ||
        (source === buyerAta.toBase58() &&
          destination === treasury.toBase58()) ||
        (transferMint === mint.toBase58() &&
          source === buyerAta.toBase58() &&
          destination === treasuryAta.toBase58());

      if (!matchesRoute) continue;

      const uiAmount = info.tokenAmount?.uiAmount;
      if (uiAmount != null && uiAmount >= expectedSvf * 0.99) {
        return { ok: true };
      }

      if (info.tokenAmount?.amount && info.tokenAmount.decimals != null) {
        const raw = Number(info.tokenAmount.amount);
        const actual =
          raw / Math.pow(10, info.tokenAmount.decimals);
        if (actual >= expectedSvf * 0.99) {
          return { ok: true };
        }
      }
    }

    // Fallback: check token balance deltas on treasury ATA
    const preToken = tx.meta.preTokenBalances ?? [];
    const postToken = tx.meta.postTokenBalances ?? [];

    const treasuryPre = preToken.find(
      (b) =>
        b.owner === treasury.toBase58() &&
        b.mint === mint.toBase58(),
    );
    const treasuryPost = postToken.find(
      (b) =>
        b.owner === treasury.toBase58() &&
        b.mint === mint.toBase58(),
    );

    if (treasuryPre && treasuryPost) {
      const preAmt = treasuryPre.uiTokenAmount.uiAmount ?? 0;
      const postAmt = treasuryPost.uiTokenAmount.uiAmount ?? 0;
      if (postAmt - preAmt >= expectedSvf * 0.99) {
        return { ok: true };
      }
    }

    return { ok: false, error: "SVF transfer to treasury not found in transaction" };
  } catch (error) {
    console.error("SVF payment verification failed:", error);
    return { ok: false, error: "Failed to verify SVF payment" };
  }
}

export async function verifyCheckoutPayments(
  transactionSignature: string,
  burnSignature: string,
  buyerWallet: string,
  solAmount: unknown,
  svfAmount: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const sol = toNumber(solAmount);
  const svf = toNumber(svfAmount);

  const solCheck = await verifySolPayment(
    transactionSignature,
    buyerWallet,
    sol,
  );
  if (!solCheck.ok) return solCheck;

  const svfCheck = await verifySvfPayment(burnSignature, buyerWallet, svf);
  if (!svfCheck.ok) return svfCheck;

  return { ok: true };
}

/** Build lamports for client-side SOL transfer. */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
