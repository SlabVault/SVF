import { Card } from "@/components/ui/card";
import { SECTION_HEADING_CLASS, SECTION_LEAD_CLASS, SECTION_STACK_CLASS } from "@/lib/layout";

const FLYWHEEL_STEPS = [
  {
    step: "01",
    title: "Crypto activity",
    body: "Trading fees and treasury inflows fund the next cycle without diluting holders.",
  },
  {
    step: "02",
    title: "Live pulls",
    body: "Treasury SOL goes to graded gacha on partner platforms — streamed for transparency.",
  },
  {
    step: "03",
    title: "Graded slabs",
    body: "Hits are graded, vaulted, and cataloged with public serials and provenance links.",
  },
  {
    step: "04",
    title: "Community vault",
    body: "Slabs sit in the multisig vault. $SVF coordinates ownership around the treasury.",
  },
] as const;

export function VaultFlywheel() {
  return (
    <section className={SECTION_STACK_CLASS} aria-labelledby="vault-flywheel-heading">
      <div className="max-w-2xl">
        <h2 id="vault-flywheel-heading" className={SECTION_HEADING_CLASS}>
          The vault flywheel
        </h2>
        <p className={SECTION_LEAD_CLASS}>
          Crypto activity → live pulls → graded slabs → public vault → community
          ownership. Each cycle compounds transparent inventory.
        </p>
      </div>

      <div
        className="hidden flex-wrap items-center justify-center gap-2 lg:flex"
        aria-hidden
      >
        {FLYWHEEL_STEPS.map((item, index) => (
          <span key={item.step} className="inline-flex items-center gap-2">
            {index > 0 ? (
              <span className="text-vault-amber/50">→</span>
            ) : null}
            <span className="rounded-lg border border-vault-amber/20 bg-vault-amber/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-vault-amber">
              {item.title}
            </span>
          </span>
        ))}
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FLYWHEEL_STEPS.map((item) => (
          <li key={item.step}>
            <Card className="relative h-full space-y-3 overflow-hidden border-line/80 bg-vault-deep/60 p-5 transition-[border-color,box-shadow] hover:border-vault-amber/25 hover:shadow-[0_0_28px_-14px_rgba(251,191,36,0.25)]">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vault-amber/40 to-transparent"
                aria-hidden
              />
              <span className="font-mono text-sm font-semibold text-vault-amber">
                {item.step}
              </span>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{item.body}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
