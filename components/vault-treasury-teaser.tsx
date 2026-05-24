import { LinkButton } from "@/components/link-button";
import { Card } from "@/components/ui/card";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export function VaultTreasuryTeaser() {
  return (
    <Card className="border-line bg-gradient-to-br from-vault-panel/80 to-vault-deep/60 p-6 transition-[border-color,box-shadow] hover:border-vault-violet/25 sm:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Treasury transparency</h2>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Squads multisig, Collector Crypt accounts, Vollector, Vaulted, Collectr,
            and SNS addresses — verify flows before you participate.
          </p>
        </div>
        <LinkButton
          href={VAULT_ROUTES.proof}
          variant="secondary"
          className="shrink-0"
          trackingEvent="cta_open_proof_from_vault_overview"
          trackingContext="vault_treasury_teaser"
        >
          View proof links
        </LinkButton>
      </div>
    </Card>
  );
}
