/**
 * Client-side Tensor fill signature checks (format-only stub).
 * Full RPC confirmation / broker-fee verify deferred to a later lane.
 */

export type TensorFillContext = {
  mint: string;
  buyer: string;
};

export type TensorFillVerifyResult =
  | { ok: true; signatures: string[] }
  | { ok: false; reason: string };

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
const SOLANA_PUBKEY_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** Solana tx signatures are base58-encoded 64-byte values (~87–88 chars). */
const SOLANA_TX_SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidSolanaPubkey(value: string): boolean {
  return SOLANA_PUBKEY_RE.test(value.trim());
}

export function isValidSolanaTxSignature(value: string): boolean {
  const trimmed = value.trim();
  return BASE58_RE.test(trimmed) && SOLANA_TX_SIGNATURE_RE.test(trimmed);
}

/**
 * Validates fill tx signatures and logs a staging-friendly record payload.
 * Does not call RPC — wire full verify later without changing call sites.
 */
export function logTensorFillSignatures(
  signatures: string[],
  context: TensorFillContext,
): TensorFillVerifyResult {
  const mint = context.mint?.trim() ?? "";
  const buyer = context.buyer?.trim() ?? "";

  if (!isNonEmptyString(mint) || !isValidSolanaPubkey(mint)) {
    return { ok: false, reason: "Invalid mint pubkey." };
  }
  if (!isNonEmptyString(buyer) || !isValidSolanaPubkey(buyer)) {
    return { ok: false, reason: "Invalid buyer pubkey." };
  }
  if (!Array.isArray(signatures) || signatures.length === 0) {
    return { ok: false, reason: "No transaction signatures returned." };
  }

  const normalized: string[] = [];
  for (const signature of signatures) {
    if (!isNonEmptyString(signature) || !isValidSolanaTxSignature(signature)) {
      return { ok: false, reason: "Invalid transaction signature format." };
    }
    normalized.push(signature.trim());
  }

  console.info("[tensor-fill-verify] staging fill record (format ok)", {
    mint,
    buyer,
    signatures: normalized,
    primarySignature: normalized[0],
    explorerUrl: `https://solscan.io/tx/${normalized[0]}`,
  });

  return { ok: true, signatures: normalized };
}
