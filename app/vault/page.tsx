import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { SlabCard } from "@/components/slab-card";
import { getSiteConfig, getSlabs } from "@/lib/site-config";

export default function VaultPage() {
  const site = getSiteConfig();
  const slabs = getSlabs();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-14">
      <header className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Vault
        </h1>
        <p className="max-w-prose text-muted">
          Every slab below is sourced from <span className="text-foreground">data/slabs.json</span>{" "}
          so you can update the gallery without touching code. Pair this page with
          Vaulted / Collectr for provenance photos and serials.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={site.links.vaulted} external variant="secondary">
            Vaulted profile
          </LinkButton>
          <LinkButton href={site.links.collectr} external variant="secondary">
            Collectr showcase
          </LinkButton>
          <LinkButton href={site.treasurySquadsUrl} external variant="secondary">
            Squads treasury
          </LinkButton>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {slabs.map((slab) => (
          <SlabCard key={slab.id} slab={slab} />
        ))}
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Vault",
  description: "Graded slabs held in the SlabVaultFi multisig vault.",
  openGraph: {
    title: "Vault — SlabVaultFi",
    description: "Graded slabs held in the SlabVaultFi multisig vault.",
    url: "/vault",
  },
};
