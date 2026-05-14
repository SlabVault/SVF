import type { Metadata } from "next";
import { PullRow } from "@/components/pull-row";
import { getPulls } from "@/lib/site-config";

export default function PullsPage() {
  const pulls = getPulls();
  const sorted = [...pulls].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-14">
      <header className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Pull history
        </h1>
        <p className="max-w-prose text-muted">
          A transparent ledger of gacha outcomes. Populate{" "}
          <span className="text-foreground">data/pulls.json</span> after each stream
          with cost, outcome, partner, and clip links.
        </p>
      </header>

      <div className="space-y-3">
        {sorted.map((pull) => (
          <PullRow key={pull.id} pull={pull} />
        ))}
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Pulls",
  description: "SlabVaultFi gacha pull history, ROI notes, and clip links.",
  openGraph: {
    title: "Pull history — SlabVaultFi",
    description: "SlabVaultFi gacha pull history, ROI notes, and clip links.",
    url: "/pulls",
  },
};
