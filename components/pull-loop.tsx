import { Card } from "@/components/ui/card";

const STEPS = [
  { label: "Fees", detail: "Creator fees from $SVF" },
  { label: "Pull", detail: "Live gacha on partner platforms" },
  { label: "Vault", detail: "Graded slabs into multisig" },
  { label: "Community", detail: "Holders share vault growth" },
] as const;

export function PullLoop() {
  return (
    <section className="space-y-4" aria-label="How the pull loop works">
      <h2 className="sr-only">Pull loop</h2>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {STEPS.map((step, index) => (
          <li key={step.label} className="relative min-w-0">
            <Card className="h-full space-y-2 border-line/80 bg-vault-panel/40 p-4 text-center sm:p-5">
              <span
                className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-vault-violet/40 bg-vault-violet/20 font-mono text-sm font-semibold text-vault-amber"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="font-heading text-sm font-bold text-foreground sm:text-base">
                {step.label}
              </p>
              <p className="text-xs leading-snug text-muted">{step.detail}</p>
            </Card>
            {index < STEPS.length - 1 ? (
              <span
                className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 text-muted sm:block"
                aria-hidden
              >
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
