/**
 * Tensor Fees program client stub — broker + collection fee PDAs.
 * Program: TFEEgwDP6nn1s8mMX2tTNPPz8j2VomkphLUmyxKm17A
 *
 * @see https://github.com/tensor-foundation/fees
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";

import { getSvfBrokerPubkey } from "@/lib/onchain/fees";
import { TENSOR_PROGRAM_IDS } from "@/lib/onchain/program-ids";

export type AttachBrokerFeeAccountsParams = {
  connection: Connection;
  collectionMint: PublicKey;
  brokerPubkey?: PublicKey;
};

/**
 * Append fee program accounts to an existing TCM fill transaction.
 * Stub — implement with fees program JS client after IDL codegen.
 */
export async function attachBrokerFeeAccounts(
  tx: Transaction,
  params: AttachBrokerFeeAccountsParams,
): Promise<Transaction> {
  const broker = params.brokerPubkey ?? new PublicKey(getSvfBrokerPubkey());
  void broker;
  void params.connection;
  void TENSOR_PROGRAM_IDS.fees;
  return tx;
}

export function getFeesProgramId(): PublicKey {
  return new PublicKey(TENSOR_PROGRAM_IDS.fees);
}
