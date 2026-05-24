import Link from "next/link";

import { FEATURE_CARD_CLASS, SECTION_HEADING_CLASS, SECTION_LEAD_CLASS, SECTION_STACK_CLASS } from "@/lib/layout";
import { VAULT_ROUTES } from "@/lib/vault-routes";

const VALUE_POINTS = [
  {
    title: "Live pulls → slabs",
    body: "Crypto activity funds live breaks and graded pulls. Every slab added to the vault is part of the public inventory story.",
    href: "/pulls",
    cta: "View pulls",
  },
  {
    title: "Transparent treasury",
    body: "Vault growth, pull history, and inventory are visible on-site — credibility over hype, with $SVF as the coordination layer.",
    href: VAULT_ROUTES.proof,
    cta: "Proof links",
  },
  {
    title: "GRAILS trade desk",
    body: "When you are ready to trade, launch GRAILS — the graded-card aggregator that unifies marketplace depth in one Solana-native desk.",
    href: "/trade",
    cta: "Open GRAILS",
    experimental: true,
  },
] as const;

export function HomeValueProp() {
  return (
    <section className={SECTION_STACK_CLASS} aria-labelledby="home-value-prop-heading">
      <div className="max-w-2xl">
        <h2 id="home-value-prop-heading" className={SECTION_HEADING_CLASS}>
          Why the vault matters
        </h2>
        <p className={SECTION_LEAD_CLASS}>
          SlabVault is the community-owned collectible vault — crypto-native,
          transparent, and built to grow with every pull and every slab on
          display.
        </p>
      </div>

      <ul className="grid gap-5 md:grid-cols-3">
        {VALUE_POINTS.map((point) => (
          <li
            key={point.title}
            className={`${FEATURE_CARD_CLASS} flex flex-col transition-[border-color,box-shadow] hover:border-vault-amber/25 hover:shadow-[0_0_28px_-14px_rgba(251,191,36,0.2)]`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground">
                {point.title}
              </h3>
              {"experimental" in point && point.experimental ? (
                <span className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-300">
                  Beta
                </span>
              ) : null}
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {point.body}
            </p>
            <Link
              href={point.href}
              className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-vault-amber underline-offset-4 transition-colors hover:underline"
              data-growth-event="cta_home_value_prop"
              data-growth-context={point.title}
            >
              {point.cta} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
