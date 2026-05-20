import type { Metadata } from "next";
import { VaultClient } from "@/components/vault-client";
import { getSiteConfig, getSlabs } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Vault",
  description: "Graded slabs held in the SlabVaultFi multisig vault.",
  openGraph: {
    title: "Vault — SlabVaultFi",
    description: "Graded slabs held in the SlabVaultFi multisig vault.",
    url: "/vault",
  },
};

export default function VaultPage() {
  const site = getSiteConfig();
  const slabs = getSlabs();

  return <VaultClient site={site} slabs={slabs} />;
}
