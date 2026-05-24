"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export default function VaultShopListingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Vault shop listing render failed:", error);
  }, [error]);

  return (
    <div className="page-shell">
      <section className="rounded-xl border border-line bg-vault-panel/50 p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Listing temporarily unavailable
        </h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          We hit a render issue while loading this slab. Retry, or return to the
          vault shop.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => unstable_retry()}>Retry</Button>
          <Button variant="outline" asChild>
            <Link href={VAULT_ROUTES.shop}>Back to Shop</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
