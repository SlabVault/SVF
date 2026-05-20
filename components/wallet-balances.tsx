import { Card } from "@/components/ui/card";
import type { SiteConfig } from "@/types/content";

type Props = {
  site: SiteConfig;
};

export function WalletBalances({ site }: Props) {
  const { treasuryBalanceSol, deployerBalanceSol, lastWalletSync } = site;

  return (
    <Card className="space-y-4 p-5 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Treasury Balances
        </h3>
        {lastWalletSync && (
          <span className="text-xs text-muted">
            Updated: {new Date(lastWalletSync).toLocaleDateString()}
          </span>
        )}
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Multi-sig Treasury
          </p>
          <p className="font-mono text-xl font-semibold text-foreground">
            {treasuryBalanceSol !== undefined ? `${treasuryBalanceSol.toFixed(4)} SOL` : "—"}
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Deployer Wallet
          </p>
          <p className="font-mono text-xl font-semibold text-foreground">
            {deployerBalanceSol !== undefined ? `${deployerBalanceSol.toFixed(4)} SOL` : "—"}
          </p>
        </div>
      </div>

      {treasuryBalanceSol === undefined && deployerBalanceSol === undefined && (
        <p className="text-sm text-muted">
          Wallet balances not available. Run data sync to fetch latest balances.
        </p>
      )}
    </Card>
  );
}
