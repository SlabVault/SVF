import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about SlabVaultFi.",
  openGraph: {
    title: "FAQ — SlabVaultFi",
    description: "Frequently asked questions about SlabVaultFi.",
    url: "/faq",
  },
};

const faqs = [
  {
    question: "What is SlabVaultFi?",
    answer: "SlabVaultFi is a community-owned collectible vault on Solana. Creator fees from $SVF trading fund live gacha pulls, and all graded slabs land in a transparent multisig vault—giving holders exposure to real-world collectibles with on-chain transparency.",
  },
  {
    question: "How do I buy $SVF?",
    answer: "You can buy $SVF on Pump.fun. Simply connect your Solana wallet and purchase the token. Always verify the contract address against official announcements before trading.",
  },
  {
    question: "What happens to the slabs from gacha pulls?",
    answer: "All slabs from gacha pulls are added to the SlabVaultFi multisig vault. The vault is transparent and can be tracked on Vaulted and Collectr, with treasury movements visible via Squads.",
  },
  {
    question: "How are gacha pulls funded?",
    answer: "Gacha pulls are funded through creator fees generated from $SVF trading. The more the token trades, the more pulls can be funded, adding more value to the vault.",
  },
  {
    question: "Who owns the vault?",
    answer: "The vault is owned by the $SVF community. It's managed through a transparent multisig (Squads), and all treasury movements are publicly trackable on-chain.",
  },
  {
    question: "Can I redeem slabs from the vault?",
    answer: "Redemption mechanics are being developed for when the vault is mature. In the future, holders may have opportunities to redeem slabs based on milestones and governance decisions.",
  },
  {
    question: "How do I verify the authenticity of links?",
    answer: "Always cross-check links against the official GitBook, this website, and the official X account (@SlabVaultFi). Never trust random DMs or unofficial links. The contract address is always available in the footer.",
  },
  {
    question: "What is the difference between Vaulted and Collectr?",
    answer: "Vaulted and Collectr are both platforms for tracking graded collectibles. Vaulted focuses on vault management and provenance, while Collectr provides showcase profiles and detailed slab information. We use both for comprehensive tracking.",
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-14 sm:space-y-14 sm:px-5 sm:py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQ", href: "/faq" }]} />

      <header className="space-y-6 animate-fade-in-up">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="max-w-prose text-muted">
          Common questions about SlabVaultFi, the vault, and how everything works.
        </p>
      </header>

      <section className="space-y-4 animate-slide-in">
        {faqs.map((faq, index) => (
          <Card
            key={index}
            className="group space-y-3 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-vault-amber animate-pulse-glow" />
              <h2 className="font-display text-lg font-semibold text-foreground group-hover:text-vault-amber transition-colors duration-300">
                {faq.question}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted pl-5">
              {faq.answer}
            </p>
          </Card>
        ))}
      </section>

      <Card className="group space-y-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/80 to-vault-deep/60 animate-fade-in-up">
        <h2 className="font-display text-xl font-semibold group-hover:text-vault-amber transition-colors duration-300">Still have questions?</h2>
        <p className="text-sm text-muted">
          Join our community on X or Telegram, or check out our GitBook for more detailed documentation.
        </p>
      </Card>
    </div>
  );
}
