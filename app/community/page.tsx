import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { getSiteConfig } from "@/lib/site-config";

export default function CommunityPage() {
  const site = getSiteConfig();

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-14">
      <header className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Community
        </h1>
        <p className="max-w-prose text-muted">
          SlabVaultFi is coordinated in public: streams, pulls, and treasury proof.
          Always verify links before signing transactions or buying collectibles.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={site.links.twitter} external>
            Follow on X
          </LinkButton>
          <LinkButton href={site.links.telegram} external variant="secondary">
            Join Telegram
          </LinkButton>
          <LinkButton href={site.links.linktree} external variant="secondary">
            Linktree
          </LinkButton>
          <LinkButton href={site.links.gitbook} external variant="ghost">
            Read the docs
          </LinkButton>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-vault-panel/60 p-6">
          <h2 className="font-display text-xl font-semibold">Gacha partners</h2>
          <p className="mt-2 text-sm text-muted">
            Referral links help the treasury run more pulls.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                className="font-semibold text-vault-amber underline-offset-4 hover:underline"
                href={site.links.gachaCollectorCrypt}
                target="_blank"
                rel="noreferrer"
              >
                Collector Crypt
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-vault-amber underline-offset-4 hover:underline"
                href={site.links.gachaPhygitals}
                target="_blank"
                rel="noreferrer"
              >
                Phygitals
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-vault-amber underline-offset-4 hover:underline"
                href={site.links.gachaBeezie}
                target="_blank"
                rel="noreferrer"
              >
                Beezie
              </a>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-vault-panel/60 p-6">
          <h2 className="font-display text-xl font-semibold">Liquidity pools</h2>
          <p className="mt-2 text-sm text-muted">Meteora DAMM v2 pools.</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                className="font-semibold text-vault-amber underline-offset-4 hover:underline"
                href={site.links.poolSvfCards}
                target="_blank"
                rel="noreferrer"
              >
                SVF / CARDS
              </a>
            </li>
            <li>
              <a
                className="font-semibold text-vault-amber underline-offset-4 hover:underline"
                href={site.links.poolSvfPigeon}
                target="_blank"
                rel="noreferrer"
              >
                SVF / PIGEON
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl font-semibold">Roadmap</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {site.roadmap.map((block) => (
            <div
              key={block.phase}
              className="rounded-2xl border border-line bg-vault-deep/60 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-vault-amber">
                {block.phase}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/25 bg-vault-panel/40 p-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Verify before you interact
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Scams clone brands, contracts, and websites. Cross-check the contract
          address in the footer against official announcements, confirm Squads
          signers, and only use links from this site, GitBook, or the official X
          account.
        </p>
      </section>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Community",
  description: "SlabVaultFi socials, referrals, pools, and roadmap.",
  openGraph: {
    title: "Community — SlabVaultFi",
    description: "SlabVaultFi socials, referrals, pools, and roadmap.",
    url: "/community",
  },
};
