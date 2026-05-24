import type { Metadata } from "next";
import { PullsClient } from "@/components/pulls-client";
import { buildPageMetadata } from "@/lib/seo";
import { getPulls } from "@/lib/site-config";

export const metadata: Metadata = buildPageMetadata({
  title: "Pulls",
  description: "Review SlabVaultFi pull history with notes and clip references.",
  path: "/pulls",
  keywords: ["pull history", "gacha results", "stream clips"],
});

export default function PullsPage() {
  const pulls = getPulls();

  return <PullsClient pulls={pulls} />;
}
