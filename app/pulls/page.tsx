import type { Metadata } from "next";
import { PullsClient } from "@/components/pulls-client";
import { getPulls } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Pulls",
  description: "SlabVaultFi gacha pull history, ROI notes, and clip links.",
  openGraph: {
    title: "Pull history — SlabVaultFi",
    description: "SlabVaultFi gacha pull history, ROI notes, and clip links.",
    url: "/pulls",
  },
};

export default function PullsPage() {
  const pulls = getPulls();

  return <PullsClient pulls={pulls} />;
}
