import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JupiterWidget } from "@/components/jupiter-widget";
import { LinkButton } from "@/components/link-button";
import { getSiteConfig } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "$SVF",
  description:
    "Trade $SVF on Jupiter and review contract + treasury references before participating.",
  path: "/svf",
  keywords: ["buy SVF", "SVF token", "Solana token"],
});

export default function SvfPage() {
  const site = getSiteConfig();

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:space-y-14 sm:px-5 sm:py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "$SVF", href: "/svf" }]} />

      <header className="space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-vault-amber animate-pulse-glow" />
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            $SVF
          </h1>
        </div>
        <p className="max-w-prose text-muted">
          Trade $SVF on Jupiter aggregator with the best rates on Solana.
        </p>
      </header>

      <section className="space-y-6 animate-slide-in">
        <Card className="group space-y-6 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold group-hover:text-vault-amber transition-colors duration-300">
              Trade $SVF
            </h2>
            <p className="text-sm text-muted">
              Swap SOL for $SVF using Jupiter aggregator for the best rates across all DEXs.
            </p>
          </div>
          <JupiterWidget />
        </Card>
      </section>

      <section className="space-y-6 animate-fade-in-up">
        <h2 className="font-display text-2xl font-semibold">How It Works</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="group space-y-3 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-vault-amber animate-pulse-glow">Step 1</p>
            <h3 className="font-display text-lg font-semibold group-hover:text-vault-amber transition-colors duration-300">Buy $SVF</h3>
            <p className="text-sm text-muted">
              Purchase $SVF on Pump.fun to become a vault holder and support the treasury.
            </p>
          </Card>
          <Card className="group space-y-3 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-vault-amber animate-pulse-glow">Step 2</p>
            <h3 className="font-display text-lg font-semibold group-hover:text-vault-amber transition-colors duration-300">Fund Pulls</h3>
            <p className="text-sm text-muted">
              Creator fees from trading fund live gacha pulls on streams, adding value to the vault.
            </p>
          </Card>
          <Card className="group space-y-3 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-vault-amber animate-pulse-glow">Step 3</p>
            <h3 className="font-display text-lg font-semibold group-hover:text-vault-amber transition-colors duration-300">Own the Vault</h3>
            <p className="text-sm text-muted">
              All slabs land in the transparent multisig vault, giving holders exposure to real-world collectibles.
            </p>
          </Card>
        </div>
      </section>

      <Card className="space-y-4 border-line bg-vault-panel/50 p-6">
        <h2 className="font-display text-2xl font-semibold">Verify before you trade</h2>
        <p className="text-sm text-muted">
          SlabVaultFi does not promise token returns. Use contract and treasury references to confirm
          authenticity before each trade.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton
            href="/vault/proof"
            variant="secondary"
            trackingEvent="cta_open_proof_from_svf"
            trackingContext="svf_verify_panel"
          >
            View proof of reserves
          </LinkButton>
          <LinkButton
            href="/faq"
            variant="ghost"
            trackingEvent="cta_open_faq_from_svf"
            trackingContext="svf_verify_panel"
          >
            Read FAQ
          </LinkButton>
        </div>
      </Card>

      <Card className="group space-y-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/80 to-vault-deep/60">
        <h2 className="font-display text-2xl font-semibold group-hover:text-vault-amber transition-colors duration-300">Contract Details</h2>
        <div className="space-y-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-muted">Token Address</span>
            <span className="font-mono text-foreground group-hover:text-vault-amber transition-colors duration-300">{site.contractAddress}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-muted">Network</span>
            <span className="font-semibold text-foreground group-hover:text-vault-amber transition-colors duration-300">Solana</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-muted">Treasury</span>
            <span className="font-mono text-foreground group-hover:text-vault-amber transition-colors duration-300">{site.vaultAddresses.snsTreasury}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
