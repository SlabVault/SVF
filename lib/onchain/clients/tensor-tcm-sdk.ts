/**
 * Tensor TCM write-path SDK wiring — `@tensor-oss/tensorswap-sdk` (pNFT list/fill)
 * with TCM program ID from `lib/onchain/program-ids.ts`.
 *
 * CC pNFT fixed asks use TensorSwap single-listing ix (SDK-examples / tensorswap-sdk).
 * TCM `listState` is validated via `@tensor-oss/tcomp-sdk` when provided on fill.
 *
 * @see https://github.com/tensor-foundation/SDK-examples/tree/main/marketplace
 */

import { AnchorProvider } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type VersionedTransaction,
} from "@solana/web3.js";
import BN from "bn.js";

import { getSvfBrokerPubkey } from "@/lib/onchain/fees";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";

/** Mainnet TCM / TCOMP program id shipped in `@tensor-oss/tcomp-sdk`. */
const TCOMP_MAINNET_PROGRAM_ID = "TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp";

export class TensorTcmProgramIdMismatchError extends Error {
  constructor() {
    super(
      `TCM program id mismatch: expected ${TENSOR_PROGRAM_IDS.marketplaceTcm}, SDK constant ${TCOMP_MAINNET_PROGRAM_ID}`,
    );
    this.name = "TensorTcmProgramIdMismatchError";
  }
}

/** Ensures repo constants match tensorswap/tcomp SDK mainnet TCM id. */
export function assertTcmProgramIdsAligned(): void {
  if (TENSOR_PROGRAM_IDS.marketplaceTcm !== TCOMP_MAINNET_PROGRAM_ID) {
    throw new TensorTcmProgramIdMismatchError();
  }
}

export type TensorTcmSwapSdk = {
  list: (args: {
    nftMint: PublicKey;
    nftSource: PublicKey;
    owner: PublicKey;
    price: BN;
    tokenProgram: PublicKey;
    payer?: PublicKey | null;
    meta: { address: PublicKey };
  }) => Promise<{ tx: { ixs: TransactionInstruction[]; extraSigners: never[] } }>;
  buySingleListing: (args: {
    nftMint: PublicKey;
    nftBuyerAcc: PublicKey;
    owner: PublicKey;
    buyer: PublicKey;
    maxPrice: BN;
    tokenProgram: PublicKey;
    takerBroker?: PublicKey | null;
    meta: { address: PublicKey };
  }) => Promise<{ tx: { ixs: TransactionInstruction[]; extraSigners: never[] } }>;
  delist: (args: {
    nftMint: PublicKey;
    nftDest: PublicKey;
    owner: PublicKey;
    tokenProgram: PublicKey;
    payer?: PublicKey | null;
    meta: { address: PublicKey };
  }) => Promise<{ tx: { ixs: TransactionInstruction[]; extraSigners: never[] } }>;
};

export type TensorTcmTcompSdk = {
  fetchListState: (listState: PublicKey) => Promise<{
    assetId: PublicKey;
    owner: PublicKey;
    amount: BN;
  }>;
};

export type TensorTcmSdkDeps = {
  swapSdk: TensorTcmSwapSdk;
  tcompSdk?: TensorTcmTcompSdk;
};

let testDepsOverride: TensorTcmSdkDeps | null = null;

/** Test-only override for mocked SDK instances. */
export function __setTensorTcmSdkDepsForTests(
  deps: TensorTcmSdkDeps | null,
): void {
  testDepsOverride = deps;
}

function signWithKeypair(
  tx: Transaction | VersionedTransaction,
  keypair: Keypair,
): void {
  if (tx instanceof Transaction) {
    tx.partialSign(keypair);
  }
}

function readOnlyProvider(connection: Connection): AnchorProvider {
  const keypair = Keypair.generate();
  return new AnchorProvider(
    connection,
    {
      publicKey: keypair.publicKey,
      signTransaction: async (tx) => {
        signWithKeypair(tx, keypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        for (const tx of txs) signWithKeypair(tx, keypair);
        return txs;
      },
    },
    { commitment: "confirmed" },
  );
}

export async function createTensorSwapSdk(
  connection: Connection,
): Promise<TensorTcmSwapSdk> {
  assertTcmProgramIdsAligned();
  const { TensorSwapSDK } = await import("@tensor-oss/tensorswap-sdk");
  const sdk = new TensorSwapSDK({ provider: readOnlyProvider(connection) });
  return sdk as unknown as TensorTcmSwapSdk;
}

export async function createTcompSdk(
  connection: Connection,
): Promise<TensorTcmTcompSdk> {
  assertTcmProgramIdsAligned();
  const { TCompSDK } = await import("@tensor-oss/tcomp-sdk");
  const sdk = new TCompSDK({
    provider: readOnlyProvider(connection),
    addr: new PublicKey(TENSOR_PROGRAM_IDS.marketplaceTcm),
  });
  return sdk as unknown as TensorTcmTcompSdk;
}

export async function resolveTensorTcmSdkDeps(
  connection: Connection,
): Promise<TensorTcmSdkDeps> {
  if (testDepsOverride) {
    return testDepsOverride;
  }
  const [swapSdk, tcompSdk] = await Promise.all([
    createTensorSwapSdk(connection),
    createTcompSdk(connection),
  ]);
  return { swapSdk, tcompSdk };
}

export type SwapListIxParams = {
  seller: PublicKey;
  mint: PublicKey;
  priceLamports: bigint;
  nftSource?: PublicKey;
};

export type SwapFillIxParams = {
  buyer: PublicKey;
  mint: PublicKey;
  listState?: PublicKey;
  owner?: PublicKey;
  maxAmountLamports?: bigint;
};

export type SwapDelistIxParams = {
  owner: PublicKey;
  mint: PublicKey;
  nftDest?: PublicKey;
};

function lamportsToBn(lamports: bigint): BN {
  return new BN(lamports.toString());
}

function transactionFromIxs(ixs: TransactionInstruction[]): Transaction {
  const tx = new Transaction();
  for (const ix of ixs) {
    tx.add(ix);
  }
  return tx;
}

/**
 * Build pNFT fixed-ask list tx (TensorSwap `list` → single listing + escrow).
 * Pattern: SDK-examples `list_legacy.ts` via legacy tensorswap single-listing path.
 */
export async function buildSwapListTransaction(
  deps: TensorTcmSdkDeps,
  connection: Connection,
  params: SwapListIxParams,
): Promise<Transaction> {
  const nftSource =
    params.nftSource ??
    getAssociatedTokenAddressSync(params.mint, params.seller, true);

  const { tx } = await deps.swapSdk.list({
    nftMint: params.mint,
    nftSource,
    owner: params.seller,
    price: lamportsToBn(params.priceLamports),
    tokenProgram: TOKEN_PROGRAM_ID,
    payer: params.seller,
    meta: { address: params.mint },
  });

  void connection;
  return transactionFromIxs(tx.ixs);
}

/**
 * Build pNFT fill tx (TensorSwap `buySingleListing`).
 * When `listState` is set, loads TCM list state via tcomp-sdk and checks mint/price.
 */
export async function buildSwapFillTransaction(
  deps: TensorTcmSdkDeps,
  connection: Connection,
  params: SwapFillIxParams,
): Promise<Transaction> {
  let owner = params.owner;
  let maxPrice = params.maxAmountLamports
    ? lamportsToBn(params.maxAmountLamports)
    : null;

  if (params.listState && deps.tcompSdk) {
    const state = await deps.tcompSdk.fetchListState(params.listState);
    if (!state.assetId.equals(params.mint)) {
      throw new Error("listState assetId does not match fill mint");
    }
    owner = owner ?? state.owner;
    maxPrice = maxPrice ?? state.amount;
  }

  if (!owner) {
    throw new Error(
      "fill requires seller owner: pass owner or a valid TCM listState",
    );
  }
  if (!maxPrice) {
    throw new Error(
      "fill requires maxAmountLamports or a valid TCM listState with amount",
    );
  }

  const nftBuyerAcc = getAssociatedTokenAddressSync(
    params.mint,
    params.buyer,
    true,
  );

  const broker = getSvfBrokerPubkey();
  const takerBroker =
    broker.length >= 32 ? new PublicKey(broker) : params.buyer;

  const { tx } = await deps.swapSdk.buySingleListing({
    nftMint: params.mint,
    nftBuyerAcc,
    owner,
    buyer: params.buyer,
    maxPrice,
    tokenProgram: TOKEN_PROGRAM_ID,
    takerBroker,
    meta: { address: params.mint },
  });

  void connection;
  return transactionFromIxs(tx.ixs);
}

/**
 * Build pNFT delist tx (TensorSwap `delist` — closes single listing + returns NFT).
 * Pattern: SDK-examples `delist_legacy.ts` via tensorswap single-listing path.
 */
export async function buildSwapDelistTransaction(
  deps: TensorTcmSdkDeps,
  connection: Connection,
  params: SwapDelistIxParams,
): Promise<Transaction> {
  const nftDest =
    params.nftDest ??
    getAssociatedTokenAddressSync(params.mint, params.owner, true);

  const { tx } = await deps.swapSdk.delist({
    nftMint: params.mint,
    nftDest,
    owner: params.owner,
    tokenProgram: TOKEN_PROGRAM_ID,
    payer: params.owner,
    meta: { address: params.mint },
  });

  void connection;
  return transactionFromIxs(tx.ixs);
}
