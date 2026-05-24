/**
 * SlabVault on-chain trade stack — Tensor Foundation + SVF broker layer.
 *
 * @see docs/integrations/onchain-trade-stack.md
 */

export {
  TENSOR_PROGRAM_IDS,
  SLABVAULT_PROGRAM_IDS,
  getTensorProgramId,
  getSlabVaultBrokerProgramId,
  getOnchainCluster,
  useTensorMainnetPrograms,
  type SolanaCluster,
  type TensorProgramKey,
} from "@/lib/onchain/program-ids";

export {
  SLABVAULT_TRADE_COLLECTIONS,
  getTradeCollectionBySlug,
  BEEZIE_OFF_CHAIN_NOTE,
  COURTYARD_OFF_CHAIN_NOTE,
  type TradeCollectionConfig,
  type TradePartnerId,
  type TradeChainId,
  type TradeSettlementMode,
  type TradeCollectionStatus,
} from "@/lib/onchain/collections";

export {
  assertTensorTradeWriteEnabled,
  fetchTensorApiJson,
  getLatestBlockhashContext,
  getSolanaConnection,
  isTensorTxBffConfigured,
  isTensorTxWriteConfigured,
  parseLamportsParam,
  parsePublicKeyParam,
  requireTensorApiKey,
  resolveBuyWritePath,
  resolveListWritePath,
  resolveDelistWritePath,
  resolveTensorTxWritePath,
  restTransactionResponse,
  sdkTransactionResponse,
  serializeLegacyTransaction,
  tensorApiHeaders,
  tensorApiUrl,
  TensorBffError,
  TensorTradeWriteDisabledError,
  type TensorBffWritePath,
} from "@/lib/onchain/tensor-tx-bff";

export {
  fetchTensorBuyTx,
  fetchTensorCollectionListings,
  fetchTensorCollectionStats,
  fetchTensorCollectionTxHistory,
  fetchTensorCollectionsRaw,
  fetchTensorDelistTx,
  fetchTensorListTx,
  fetchTensorMintCollectionRaw,
  type TensorCollectionStats,
  type TensorCollectionTx,
  type TensorCollectionTxHistoryPage,
  type TensorListingsPage,
  type TensorMintListing,
  type TensorSerializedTx,
  type TensorTxBuildResponse,
  type TensorTxType,
} from "@/lib/onchain/tensor-api";

export {
  getSvfBrokerPubkey,
  isSvfBrokerConfigured,
  getTargetBrokerFeeBps,
  previewFeeSplit,
  type FeeSplitPreview,
} from "@/lib/onchain/fees";

export {
  BROKER_CONFIG_SEED,
  findBrokerConfigPda,
  getTensorFeesProgramId,
  getTensorMarketplaceProgramId,
} from "@/lib/onchain/pdas";

export * from "@/lib/onchain/clients/tensor-tcm";
export * from "@/lib/onchain/clients/tensor-fees";
export * from "@/lib/onchain/clients/tensor-escrow";
export * from "@/lib/onchain/clients/tensor-whitelist";
export * from "@/lib/onchain/clients/tensor-amm";
export * from "@/lib/onchain/clients/slabvault-broker";
