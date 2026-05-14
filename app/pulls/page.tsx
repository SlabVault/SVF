import type { Metadata } from "next";
import { PullRow } from "@/components/pull-row";
import { PullStatsStrip } from "@/components/pull-stats-strip";
import { summarizePulls } from "@/lib/pull-stats";
import { getPulls } from "@/lib/site-config";

export default function PullsPage() {
  const pulls = getPulls();
  const sorted = [...pulls].sort((a, b) => (a.date < b.date ? 1 : -1));
  const stats = summarizePulls(sorted);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-14 sm:space-y-12 sm:px-5 sm:py-16">
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

      <PullStatsStrip stats={stats} />

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
