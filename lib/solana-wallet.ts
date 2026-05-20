import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js";

// RPC provider - use Helius or QuickNode for production
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export type WalletTokenBalance = {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
  name?: string;
};

export type WalletTransaction = {
  signature: string;
  timestamp: number;
  type: string;
  amount?: number;
  from?: string;
  to?: string;
};

export type WalletData = {
  address: string;
  balanceSol: number;
  tokens: WalletTokenBalance[];
  recentTransactions: WalletTransaction[];
};

/**
 * Get wallet data including SOL balance, token holdings, and recent transactions
 */
export async function getWalletData(
  walletAddress: string,
  limit: number = 10
): Promise<WalletData | null> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const publicKey = new PublicKey(walletAddress);

    // Get SOL balance
    const balance = await connection.getBalance(publicKey);
    const balanceSol = balance / 1e9; // Convert lamports to SOL

    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );

    const tokens: WalletTokenBalance[] = tokenAccounts.value
      .map((account) => {
        const parsedData = account.account.data as ParsedAccountData;
        const tokenInfo = parsedData.parsed.info;
        
        return {
          mint: tokenInfo.mint,
          amount: tokenInfo.tokenAmount.amount,
          decimals: tokenInfo.tokenAmount.decimals,
          symbol: tokenInfo.tokenAmount.symbol,
          name: tokenInfo.tokenAmount.name,
        };
      })
      .filter((token) => token.amount > 0); // Only include tokens with non-zero balance

    // Get recent transactions
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit,
    });

    const transactions: WalletTransaction[] = await Promise.all(
      signatures.map(async (sig) => {
        try {
          const tx = await connection.getParsedTransaction(sig.signature);
          if (!tx) return null;

          const meta = tx.meta;
          const message = tx.transaction?.message;

          let type = "transfer";
          let amount: number | undefined;
          let from: string | undefined;
          let to: string | undefined;

          // Try to extract transaction details
          if (meta && message) {
            const preBalances = meta.preBalances || [];
            const postBalances = meta.postBalances || [];
            
            // Simple logic to determine transfer amount
            if (preBalances.length > 0 && postBalances.length > 0) {
              const balanceChange = (postBalances[0] - preBalances[0]) / 1e9;
              if (balanceChange < 0) {
                amount = Math.abs(balanceChange);
                type = "send";
              } else if (balanceChange > 0) {
                amount = balanceChange;
                type = "receive";
              }
            }
          }

          return {
            signature: sig.signature,
            timestamp: sig.blockTime || Date.now() / 1000,
            type,
            amount,
            from,
            to,
          };
        } catch {
          return null;
        }
      })
    ).then((results) => results.filter((tx) => tx !== null) as WalletTransaction[]);

    return {
      address: walletAddress,
      balanceSol,
      tokens,
      recentTransactions: transactions,
    };
  } catch (error: unknown) {
    console.error("Error fetching wallet data:", error);
    return null;
  }
}

/**
 * Get specific token balance for a wallet
 */
export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string
): Promise<number | null> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const publicKey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(tokenMint);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { mint: mintPubkey }
    );

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    const parsedData = tokenAccounts.value[0].account.data as ParsedAccountData;
    const tokenInfo = parsedData.parsed.info;
    
    return parseFloat(tokenInfo.tokenAmount.amount);
  } catch (error: unknown) {
    console.error("Error getting token balance:", error);
    return null;
  }
}

/**
 * Get transaction details by signature
 */
export async function getTransactionDetails(
  signature: string
): Promise<unknown | null> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const tx = await connection.getParsedTransaction(signature);
    return tx;
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return null;
  }
}
